import { jstNow } from './utils.js';

export interface RecordActionInput {
  xAccountId: string;
  tweetId: string;
  actionType: 'like' | 'repost' | 'reply';
}

/**
 * Record an engagement action (INSERT OR IGNORE for idempotency).
 */
export async function recordAction(
  db: D1Database,
  input: RecordActionInput,
): Promise<void> {
  const id = `${input.xAccountId}_${input.tweetId}_${input.actionType}`;
  await db
    .prepare(
      'INSERT OR IGNORE INTO engagement_actions (id, x_account_id, tweet_id, action_type, created_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(id, input.xAccountId, input.tweetId, input.actionType, jstNow())
    .run();
}

/**
 * Get all engagement actions for the given tweet IDs.
 * Returns a map of tweetId -> array of action_types.
 */
export async function getActions(
  db: D1Database,
  xAccountId: string,
  tweetIds: string[],
): Promise<Record<string, string[]>> {
  if (tweetIds.length === 0) return {};

  // D1 doesn't support large IN clauses well, batch in chunks of 50
  const result: Record<string, string[]> = {};
  const chunkSize = 50;

  for (let i = 0; i < tweetIds.length; i += chunkSize) {
    const chunk = tweetIds.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '?').join(',');
    const rows = await db
      .prepare(
        `SELECT tweet_id, action_type FROM engagement_actions WHERE x_account_id = ? AND tweet_id IN (${placeholders})`,
      )
      .bind(xAccountId, ...chunk)
      .all<{ tweet_id: string; action_type: string }>();

    for (const row of rows.results) {
      if (!result[row.tweet_id]) result[row.tweet_id] = [];
      result[row.tweet_id].push(row.action_type);
    }
  }

  return result;
}
