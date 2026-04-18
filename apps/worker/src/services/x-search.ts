// Twitter web app bearer token (public, same value used by all browser sessions)
const TWITTER_BEARER =
  'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I%2FDex%2Bu0AQDE%3DAFBUEGxNLH4gZEFCpGbxC3mhFiKv4FAQK9hqFZBlUCEY4xLAVg';

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
