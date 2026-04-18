import { getScraper, SearchMode } from '../scraper.js';
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
  const themesRes = await client.get<{ success: boolean; data: Array<{ id: string; name: string; query: string }> }>('/api/search-themes');
  const themes = themesRes.data.filter((t: any) => t.is_active !== 0);
  if (themes.length === 0) return 'アクティブな検索テーマがありません。ダッシュボードでテーマを追加してください。';

  // 2. ローカルスクレイパーで各テーマを検索
  const scraper = await getScraper();
  const allTweets: any[] = [];

  for (const theme of themes) {
    const query = `${theme.query} lang:ja -filter:retweets`;
    try {
      let count = 0;
      for await (const tweet of scraper.searchTweets(query, maxPerTheme, SearchMode.Latest)) {
        allTweets.push({
          id: tweet.id ?? '',
          text: tweet.text ?? '',
          author_id: tweet.userId ?? '',
          author_username: tweet.username ?? '',
          author_display_name: tweet.name ?? '',
          public_metrics: {
            like_count: tweet.likes ?? 0,
            retweet_count: tweet.retweets ?? 0,
            reply_count: tweet.replies ?? 0,
            quote_count: tweet.bookmarkCount ?? 0,
          },
          created_at: tweet.timeParsed?.toISOString() ?? '',
        });
        count++;
        if (count >= maxPerTheme) break;
      }
    } catch (err: any) {
      console.error(`[report] Search failed for theme "${theme.name}":`, err.message);
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
