import { getScraper } from '../scraper.js';
import { saveCookieCache } from '../browser-auth.js';
import type { XHarnessClient } from '../client.js';

const TWITTER_BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA';
const TWITTER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';
const CREATE_TWEET_QUERY_ID = 'SoVnbfCycZ7fERGCwpZkYA';

async function refreshCt0(authToken: string): Promise<string> {
  const res = await fetch('https://x.com/i/api/1.1/account/verify_credentials.json', {
    headers: {
      'Authorization': `Bearer ${TWITTER_BEARER}`,
      'Cookie': `auth_token=${authToken}`,
      'User-Agent': TWITTER_UA,
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
    },
  });
  const ct0 = res.headers.getSetCookie?.()
    ?.find(c => c.startsWith('ct0='))?.split(';')[0]?.split('=')[1];
  if (!ct0) throw new Error('ct0 の更新に失敗しました');
  return ct0;
}

export const tweetPostToolDefs = [
  {
    name: 'post_tweet',
    description: 'ローカルスクレイパーの認証を使って X にツイートを投稿する（API クレジット不要）。返信は replyToId、引用RTは quoteTweetId を指定。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        text: { type: 'string', description: '投稿するテキスト' },
        replyToId: { type: 'string', description: '返信先のツイートID（任意）' },
        quoteTweetId: { type: 'string', description: '引用RTするツイートID（任意）' },
      },
      required: ['text'],
    },
  },
  {
    name: 'execute_pending_posts',
    description: 'ダッシュボードで「投稿待ち」に追加されたツイートをすべて実行してXに投稿する。',
    inputSchema: {
      type: 'object' as const,
      properties: {
        xAccountId: { type: 'string', description: 'X アカウント ID' },
      },
      required: ['xAccountId'],
    },
  },
];

async function postTweetWithScraper(
  text: string,
  options: { replyToId?: string; quoteTweetId?: string } = {},
): Promise<{ id: string }> {
  const scraper = await getScraper();
  const cookies = await scraper.getCookies();
  const authToken = cookies.find((c: any) => c.key === 'auth_token')?.value;
  if (!authToken) throw new Error('Twitter 認証クッキーが取得できません。TWITTER_USERNAME / TWITTER_PASSWORD を確認してください。');

  // ct0 は X セッションごとに更新されるため、毎回 GET で最新値を取得する
  const ct0 = await refreshCt0(authToken);
  saveCookieCache(authToken, ct0);

  const tweetText = options.quoteTweetId ? `${text}\nhttps://x.com/i/status/${options.quoteTweetId}` : text;
  const variables: Record<string, any> = {
    tweet_text: tweetText,
    dark_request: false,
    media: { media_entities: [], possibly_sensitive: false },
    semantic_annotation_ids: [],
  };
  if (options.replyToId) {
    variables.reply = { in_reply_to_tweet_id: options.replyToId, exclude_reply_user_ids: [] };
  }

  const res = await fetch(`https://x.com/i/api/graphql/${CREATE_TWEET_QUERY_ID}/CreateTweet`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TWITTER_BEARER}`,
      'Cookie': `auth_token=${authToken}; ct0=${ct0}`,
      'x-csrf-token': ct0,
      'Content-Type': 'application/json',
      'origin': 'https://x.com',
      'referer': 'https://x.com/',
      'x-twitter-active-user': 'yes',
      'x-twitter-auth-type': 'OAuth2Session',
      'User-Agent': TWITTER_UA,
      'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
      'sec-ch-ua-platform': '"Windows"',
      'sec-fetch-site': 'same-site',
      'sec-fetch-mode': 'cors',
      'sec-fetch-dest': 'empty',
    },
    body: JSON.stringify({
      variables,
      features: {
        freedom_of_speech_not_reach_fetch_enabled: true,
        standardized_nudges_misinfo: true,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
        longform_notetweets_rich_text_read_enabled: true,
        longform_notetweets_inline_media_enabled: false,
        responsive_web_enhance_cards_enabled: false,
      },
    }),
  });

  const data = await res.json() as any;
  if (!res.ok) throw new Error(`CreateTweet failed: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);

  const result = data?.data?.create_tweet?.tweet_results?.result;
  const id = result?.rest_id ?? result?.legacy?.id_str;
  if (!id) throw new Error(`予期しないレスポンス: ${JSON.stringify(data).slice(0, 300)}`);
  return { id };
}

export async function handlePostTool(name: string, a: Record<string, any>, client?: XHarnessClient): Promise<string> {
  if (name === 'post_tweet') {
    const result = await postTweetWithScraper(a.text, { replyToId: a.replyToId, quoteTweetId: a.quoteTweetId });
    return JSON.stringify({ success: true, id: result.id, url: `https://x.com/i/status/${result.id}` });
  }

  if (name === 'execute_pending_posts') {
    if (!client) throw new Error('client required');
    const res = await client.get<{ success: boolean; data: any[] }>(
      `/api/posts/pending?xAccountId=${encodeURIComponent(a.xAccountId)}`,
    );
    const pending = res.data ?? [];
    if (pending.length === 0) return '投稿待ちはありません。';

    const results: string[] = [];
    for (const p of pending) {
      try {
        const actionType = p.commentary ?? 'new';
        const targetId = p.reply_draft || p.author_id || undefined;
        const posted = await postTweetWithScraper(
          p.text,
          actionType === 'reply' ? { replyToId: targetId } : actionType === 'quote' ? { quoteTweetId: targetId } : {},
        );
        await client.del(`/api/posts/pending/${p.id}`);
        results.push(`✓ 投稿: https://x.com/i/status/${posted.id}`);
      } catch (err: any) {
        results.push(`✗ 失敗 (id=${p.id}): ${err.message}`);
      }
    }
    return results.join('\n');
  }

  throw new Error(`Unknown tool: ${name}`);
}
