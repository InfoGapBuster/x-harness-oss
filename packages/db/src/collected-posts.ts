import { jstNow } from './utils.js';

export interface DbCollectedPost {
  id: string;
  x_account_id: string;
  query: string | null;
  author_id: string;
  author_username: string | null;
  author_display_name: string | null;
  author_profile_image_url: string | null;
  text: string;
  created_at: string;
  discovered_at: string;
  public_metrics: string | null;
  commentary: string | null;
  reply_draft: string | null;
}

export interface SaveCollectedPostInput {
  id: string;
  authorId: string;
  authorUsername?: string | null;
  authorDisplayName?: string | null;
  authorProfileImageUrl?: string | null;
  text: string;
  createdAt: string;
  publicMetrics?: any;
  commentary?: string | null;
  replyDraft?: string | null;
}

export async function saveCollectedPosts(
  db: D1Database,
  xAccountId: string,
  query: string | null,
  posts: SaveCollectedPostInput[],
): Promise<void> {
  if (posts.length === 0) return;
  const now = jstNow();
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO collected_posts (id, x_account_id, query, author_id, author_username, author_display_name, author_profile_image_url, text, created_at, discovered_at, public_metrics, commentary, reply_draft) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const batch = posts.map((p) =>
    stmt.bind(
      p.id,
      xAccountId,
      query,
      p.authorId,
      p.authorUsername ?? null,
      p.authorDisplayName ?? null,
      p.authorProfileImageUrl ?? null,
      p.text,
      p.createdAt,
      now,
      p.publicMetrics ? JSON.stringify(p.publicMetrics) : null,
      p.commentary ?? null,
      p.replyDraft ?? null,
    ),
  );
  await db.batch(batch);
}

export async function getCollectedPosts(
  db: D1Database,
  xAccountId: string,
  opts: {
    query?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<DbCollectedPost[]> {
  const { query, limit = 50, offset = 0 } = opts;
  let sql = 'SELECT * FROM collected_posts WHERE x_account_id = ?';
  const binds: any[] = [xAccountId];

  if (query) {
    sql += ' AND query = ?';
    binds.push(query);
  }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  binds.push(limit, offset);

  const result = await db.prepare(sql).bind(...binds).all<DbCollectedPost>();
  return result.results;
}

export async function deleteCollectedPost(
  db: D1Database,
  id: string,
): Promise<void> {
  await db.prepare('DELETE FROM collected_posts WHERE id = ?').bind(id).run();
}
