const X_WEB_BEARER = 'AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LTMVlYgrMZHYA7hPZZzLEhsLECEGfSalLjnimDz';

async function getGuestToken(): Promise<string> {
  const res = await fetch('https://api.twitter.com/1.1/guest/activate.json', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${X_WEB_BEARER}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ゲストトークン取得エラー: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json() as { guest_token: string };
  return data.guest_token;
}

export async function searchTweetsWithCookies(
  query: string,
  authToken: string,
  ct0: string,
  count = 100,
): Promise<any[]> {
  const guestToken = await getGuestToken();

  const url = new URL('https://api.twitter.com/1.1/search/tweets.json');
  url.searchParams.set('q', query);
  url.searchParams.set('count', String(count));
  url.searchParams.set('result_type', 'recent');
  url.searchParams.set('tweet_mode', 'extended');

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${X_WEB_BEARER}`,
      'x-guest-token': guestToken,
      'Cookie': `auth_token=${authToken}; ct0=${ct0}`,
      'x-csrf-token': ct0,
      'x-twitter-auth-type': 'OAuth2Session',
      'x-twitter-active-user': 'yes',
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
