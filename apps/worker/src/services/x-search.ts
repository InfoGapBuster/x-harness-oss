import { buildOAuth1Header } from '@x-harness/x-sdk';

export interface OAuth1Credentials {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export async function searchTweetsV1(
  query: string,
  creds: OAuth1Credentials,
  count = 100,
): Promise<any[]> {
  const url = new URL('https://api.twitter.com/1.1/search/tweets.json');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));
  url.searchParams.set('result_type', 'recent');
  url.searchParams.set('tweet_mode', 'extended');

  const authHeader = await buildOAuth1Header('GET', url.toString(), {
    consumerKey: creds.consumerKey,
    consumerSecret: creds.consumerSecret,
    accessToken: creds.accessToken,
    accessTokenSecret: creds.accessTokenSecret,
  });

  const res = await fetch(url.toString(), {
    headers: { 'Authorization': authHeader },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`X v1.1 検索エラー: ${res.status} ${text.slice(0, 200)}`);
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
