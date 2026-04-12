export interface DbSearchTheme {
  id: string;
  name: string;
  query: string;
  min_likes: number;
  min_retweets: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export async function getActiveSearchThemes(db: D1Database): Promise<DbSearchTheme[]> {
  const result = await db
    .prepare('SELECT * FROM search_themes WHERE is_active = 1')
    .all<DbSearchTheme>();
  return result.results;
}

export async function getAllSearchThemes(db: D1Database): Promise<DbSearchTheme[]> {
  const result = await db
    .prepare('SELECT * FROM search_themes ORDER BY created_at DESC')
    .all<DbSearchTheme>();
  return result.results;
}

export async function createSearchTheme(
  db: D1Database,
  theme: Omit<DbSearchTheme, 'id' | 'created_at' | 'updated_at'>
): Promise<DbSearchTheme> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const newTheme: DbSearchTheme = {
    ...theme,
    id,
    created_at: now,
    updated_at: now,
  };

  await db
    .prepare(
      'INSERT INTO search_themes (id, name, query, min_likes, min_retweets, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    )
    .bind(
      newTheme.id,
      newTheme.name,
      newTheme.query,
      newTheme.min_likes,
      newTheme.min_retweets,
      newTheme.is_active,
      newTheme.created_at,
      newTheme.updated_at
    )
    .run();

  return newTheme;
}

export async function updateSearchTheme(
  db: D1Database,
  id: string,
  updates: Partial<Omit<DbSearchTheme, 'id' | 'created_at' | 'updated_at'>>
): Promise<void> {
  const now = new Date().toISOString();
  const sets: string[] = ['updated_at = ?'];
  const values: any[] = [now];

  for (const [key, value] of Object.entries(updates)) {
    sets.push(`${key} = ?`);
    values.push(value);
  }
  values.push(id);

  await db
    .prepare(`UPDATE search_themes SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();
}

export async function deleteSearchTheme(db: D1Database, id: string): Promise<void> {
  await db.prepare('DELETE FROM search_themes WHERE id = ?').bind(id).run();
}
