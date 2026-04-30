import { getScraper, resetScraper, SearchMode } from '../scraper.js';
import type { XHarnessClient } from '../client.js';

export const reportToolDefs = [
  {
    name: 'generate_daily_report',
    description:
      'アクティブな検索テーマで X を検索し、結果を Claude で分析してダッシュボードに保存する。' +
      'X API 不要。ローカルのスクレイパーを使うため CF Worker のIP制限を回避できる。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        xAccountId: { type: 'string', description: '保存先の X アカウント ID' },
        maxPerTheme: { type: 'number', description: 'テーマごとの最大取得件数（デフォルト: 30）' },
      },
      required: ['xAccountId'],
    },
  },
];

export async function handleReportTool(
  name: string,
  a: Record<string, any>,
  client: XHarnessClient,
): Promise<string> {
  if (name !== 'generate_daily_report') throw new Error(`Unknown tool: ${name}`);

  const maxPerTheme: number = a.maxPerTheme ?? 30;

  // 1. アクティブなテーマ一覧を取得
  const themesRes = await client.get<{ success: boolean; data: Array<{ id: string; name: string; query: string; min_likes: number; min_retweets: number; is_active: number }> }>('/api/search-themes');
  const themes = themesRes.data.filter((t: any) => t.is_active !== 0);
  if (themes.length === 0) return 'アクティブな検索テーマがありません。ダッシュボードでテーマを追加してください。';

  // 2. ローカルスクレイパーで各テーマを検索（閾値でフィルター）
  const allTweets: any[] = [];

  const searchTheme = async (scraper: Awaited<ReturnType<typeof getScraper>>, theme: typeof themes[0]): Promise<number> => {
    const query = `${theme.query} lang:ja -filter:retweets`;
    const minLikes = theme.min_likes ?? 0;
    const minRetweets = theme.min_retweets ?? 0;
    let count = 0;
    for await (const tweet of scraper.searchTweets(query, maxPerTheme * 3, SearchMode.Latest)) {
      const likes = tweet.likes ?? 0;
      const retweets = tweet.retweets ?? 0;
      if (likes < minLikes || retweets < minRetweets) continue;
      allTweets.push({
        id: tweet.id ?? '',
        text: tweet.text ?? '',
        author_id: tweet.userId ?? '',
        author_username: tweet.username ?? '',
        author_display_name: tweet.name ?? '',
        public_metrics: {
          like_count: likes,
          retweet_count: retweets,
          reply_count: tweet.replies ?? 0,
          quote_count: tweet.bookmarkCount ?? 0,
        },
        created_at: tweet.timeParsed?.toISOString() ?? '',
      });
      count++;
      if (count >= maxPerTheme) break;
    }
    return count;
  };

  for (const theme of themes) {
    const minLikes = theme.min_likes ?? 0;
    const minRetweets = theme.min_retweets ?? 0;
    try {
      const scraper = await getScraper();
      const count = await searchTheme(scraper, theme);
      console.error(`[report] "${theme.name}": ${count} 件 (min_likes≥${minLikes}, min_retweets≥${minRetweets})`);
    } catch (err: any) {
      console.error(`[report] "${theme.name}" エラー: ${err.message} → スクレイパーリセットしてリトライ`);
      resetScraper();
      try {
        const fresh = await getScraper();
        const count = await searchTheme(fresh, theme);
        console.error(`[report] "${theme.name}" リトライ成功: ${count} 件`);
      } catch (retryErr: any) {
        console.error(`[report] "${theme.name}" リトライも失敗: ${retryErr.message}`);
      }
    }
  }

  if (allTweets.length === 0) {
    return 'ツイートが取得できませんでした。検索テーマや認証情報を確認してください。';
  }

  // 3. Worker API に渡して Claude 分析 + 保存
  const res = await client.post<{ success: boolean; data?: { count: number }; error?: string }>(
    `/api/search-themes/run?xAccountId=${encodeURIComponent(a.xAccountId)}`,
    { tweets: allTweets },
  );

  if (!res.success) return `保存に失敗しました: ${res.error}`;
  return `完了。${res.data?.count ?? 0} 件のポストをダッシュボードに保存しました。ブラウザをリロードして確認してください。`;
}
