import { jstNow } from './utils.js';

export interface DbQuoteTweet {
  id: string;
  source_tweet_id: string;
  x_account_id: string;
  author_id: string;
  author_username: string | null;
  author_display_name: string | null;
  author_profile_image_url: string | null;
  text: string;
  created_at: string;
  discovered_at: string;
}

export interface SaveQuoteTweetInput {
  id: string;
  authorId: string;
  authorUsername?: string | null;
  authorDisplayName?: string | null;
  authorProfileImageUrl?: string | null;
  text: string;
  createdAt: string;
}

export async function saveQuoteTweets(
  db: D1Database,
  xAccountId: string,
  sourceTweetId: string,
  quotes: SaveQuoteTweetInput[],
): Promise<void> {
  if (quotes.length === 0) return;
  const now = jstNow();
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO quote_tweets (id, source_tweet_id, x_account_id, author_id, author_username, author_display_name, author_profile_image_url, text, created_at, discovered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const batch = quotes.map((q) =>
    stmt.bind(
      q.id,
      sourceTweetId,
      xAccountId,
      q.authorId,
      q.authorUsername ?? null,
      q.authorDisplayName ?? null,
      q.authorProfileImageUrl ?? null,
      q.text,
      q.createdAt,
      now,
    ),
  );
  await db.batch(batch);
}

export async function getQuoteTweetsByAccount(
  db: D1Database,
  xAccountId: string,
  limit = 50,
  offset = 0,
): Promise<DbQuoteTweet[]> {
  const result = await db
    .prepare('SELECT * FROM quote_tweets WHERE x_account_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .bind(xAccountId, limit, offset)
    .all<DbQuoteTweet>();
  return result.results;
}

export async function getQuoteTweetsBySource(
  db: D1Database,
  sourceTweetId: string,
): Promise<DbQuoteTweet[]> {
  const result = await db
    .prepare('SELECT * FROM quote_tweets WHERE source_tweet_id = ? ORDER BY created_at DESC')
    .bind(sourceTweetId)
    .all<DbQuoteTweet>();
  return result.results;
}

export async function getLatestDiscoveredAt(
  db: D1Database,
  xAccountId: string,
): Promise<string | null> {
  const row = await db
    .prepare('SELECT MAX(discovered_at) as latest FROM quote_tweets WHERE x_account_id = ?')
    .bind(xAccountId)
    .first<{ latest: string | null }>();
  return row?.latest ?? null;
}
