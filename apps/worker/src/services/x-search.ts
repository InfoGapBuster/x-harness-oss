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

// GraphQL query ID for CreateTweet mutation (X internal API)
const CREATE_TWEET_QUERY_ID = 'SoVnbfCycZ7fERGCwpZkYA';

export async function createTweetWithCookies(
  text: string,
  authToken: string,
  ct0: string,
  options: { replyToId?: string; quoteTweetId?: string } = {},
): Promise<{ id: string; text: string }> {
  // For quote RT: append tweet URL — X renders it as an embedded quote preview
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
      ...COOKIE_HEADERS(authToken, ct0),
      'Content-Type': 'application/json',
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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`X GraphQL CreateTweet failed: ${res.status} ${err.slice(0, 300)}`);
  }

  const data = await res.json() as any;
  const result = data?.data?.create_tweet?.tweet_results?.result;
  const id = result?.rest_id ?? result?.legacy?.id_str;
  const legacy = result?.legacy;
  if (!id) throw new Error(`CreateTweet: unexpected response shape: ${JSON.stringify(data).slice(0, 300)}`);
  return { id, text: legacy?.full_text ?? legacy?.text ?? tweetText };
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
