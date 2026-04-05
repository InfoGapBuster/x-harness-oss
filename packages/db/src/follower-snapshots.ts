import { jstNow } from './utils.js';

export interface DbFollowerSnapshot {
  id: string;
  x_account_id: string;
  followers_count: number;
  following_count: number;
  tweet_count: number;
  recorded_at: string;
}

export async function recordSnapshot(
  db: D1Database,
  input: {
    xAccountId: string;
    followersCount: number;
    followingCount: number;
    tweetCount: number;
  },
): Promise<DbFollowerSnapshot> {
  const id = crypto.randomUUID();
  const now = jstNow();
  // Use JST date portion as recorded_at (YYYY-MM-DD)
  const recordedAt = now.slice(0, 10);
  const result = await db
    .prepare(
      `INSERT INTO follower_snapshots (id, x_account_id, followers_count, following_count, tweet_count, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
    )
    .bind(id, input.xAccountId, input.followersCount, input.followingCount, input.tweetCount, recordedAt)
    .first<DbFollowerSnapshot>();
  return result!;
}

export async function getSnapshots(
  db: D1Database,
  xAccountId: string,
  days = 30,
): Promise<DbFollowerSnapshot[]> {
  const now = jstNow();
  // Calculate cutoff date
  const cutoff = new Date(new Date(now).getTime() - days * 24 * 60 * 60_000);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const result = await db
    .prepare(
      `SELECT * FROM follower_snapshots
       WHERE x_account_id = ? AND recorded_at >= ?
       ORDER BY recorded_at ASC`,
    )
    .bind(xAccountId, cutoffDate)
    .all<DbFollowerSnapshot>();
  return result.results;
}

export async function hasSnapshotForToday(
  db: D1Database,
  xAccountId: string,
): Promise<boolean> {
  const now = jstNow();
  const today = now.slice(0, 10);
  const row = await db
    .prepare(
      `SELECT 1 FROM follower_snapshots WHERE x_account_id = ? AND recorded_at = ? LIMIT 1`,
    )
    .bind(xAccountId, today)
    .first();
  return row !== null;
}
