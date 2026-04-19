// Twitter web app bearer token (public, same value used by all browser sessions)
const TWITTER_BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I%2FDex%2Bu0AQDE%3DAFBUEGxNLH4gZEFCpGbxC3mhFiKv4FAQK9hqFZBlUCEY4xLAVg';

const COOKIE_HEADERS = (authToken: string, ct0: string) => ({
  'Authorization': `Bearer ${TWITTER_BEARER}`,
  'Cookie': `auth_token=${authToken}; ct0=${ct0}`,
  'X-Csrf-Token': ct0,
  'X-Twitter-Active-User': 'yes',
  'X-Twitter-Auth-Type': 'OAuth2Session',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Referer': 'https://x.com/',
});

export async function createTweetWithCookies(
  text: string,
  authToken: string,
  ct0: string,
  options: { replyToId?: string; quoteTweetId?: string } = {},
): Promise<{ id: string; text: string }> {
  // For quote RT: append the original tweet URL — X renders it as an embedded quote
  const fullText = options.quoteTweetId ? `${text}\nhttps://x.com/i/status/${options.quoteTweetId}` : text;

  const body = new URLSearchParams();
  body.set('status', fullText);
  body.set('tweet_mode', 'extended');
  if (options.replyToId) {
    body.set('in_reply_to_status_id', options.replyToId);
    body.set('auto_populate_reply_metadata', 'true');
  }

  const res = await fetch('https://api.twitter.com/1.1/statuses/update.json', {
    method: 'POST',
    headers: {
      ...COOKIE_HEADERS(authToken, ct0),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X API POST /1.1/statuses/update failed: ${res.status} ${err.slice(0, 300)}`);
  }

  const data = await res.json() as { id_str: string; full_text?: string; text?: string };
  return { id: data.id_str, text: data.full_text ?? data.text ?? '' };
}

export async function searchTweetsWithCookies(
  query: string,
  authToken: string,
  ct0: string,
  count = 20,
): Promise<any[]> {
  const url = new URL('https://api.twitter.com/1.1/search/tweets.json');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));
  url.searchParams.set('result_type', 'recent');
  url.searchParams.set('tweet_mode', 'extended');

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${TWITTER_BEARER}`,
      'Cookie': `auth_token=${authToken}; ct0=${ct0}`,
      'X-Csrf-Token': ct0,
      'X-Twitter-Active-User': 'yes',
      'X-Twitter-Auth-Type': 'OAuth2Session',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://twitter.com/',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X 検索エラー: ${res.status} ${text.slice(0, 200)}`);
  }

  const data = await res.json() as { statuses?: any[] };
  return (data.statuses ?? []).map((t: any) => ({
    id: t.id_str,
    text: t.full_text || t.text,
    author_id: t.user?.id_str,
    author_username: t.user?.screen_name,
    author_display_name: t.user?.name,
    public_metrics: {
      like_count: t.favorite_count ?? 0,
      retweet_count: t.retweet_count ?? 0,
      reply_count: 0,
      quote_count: 0,
    },
    created_at: t.created_at,
  }));
}
