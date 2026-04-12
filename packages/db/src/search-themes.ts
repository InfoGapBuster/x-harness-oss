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
