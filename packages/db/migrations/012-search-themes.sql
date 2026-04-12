-- Migration: search-themes
-- Configures keywords and thresholds for daily Grok reports

CREATE TABLE IF NOT EXISTS search_themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  min_likes INTEGER DEFAULT 0,
  min_retweets INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Seed initial themes from user requirements
INSERT OR IGNORE INTO search_themes (id, name, query, min_likes, min_retweets, created_at, updated_at) VALUES
('theme_1', 'ダイバーシティ', 'ダイバーシティ', 100, 100, datetime('now'), datetime('now')),
('theme_2', 'インクルージョン', 'インクルージョン', 50, 50, datetime('now'), datetime('now')),
('theme_3', 'ビジネスと人権', 'ビジネスと人権', 30, 30, datetime('now'), datetime('now')),
('theme_4', '手話', '手話', 50, 50, datetime('now'), datetime('now'));
