-- Migration: collected-posts
-- Supports general post collection via search or timelines, similar to x_post_collector

CREATE TABLE IF NOT EXISTS collected_posts (
  id TEXT PRIMARY KEY,
  x_account_id TEXT NOT NULL,
  query TEXT,
  author_id TEXT NOT NULL,
  author_username TEXT,
  author_display_name TEXT,
  author_profile_image_url TEXT,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  discovered_at TEXT NOT NULL,
  public_metrics TEXT, -- JSON string of X public_metrics
  FOREIGN KEY (x_account_id) REFERENCES x_accounts(id)
);

CREATE INDEX IF NOT EXISTS idx_collected_posts_account ON collected_posts(x_account_id, discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_collected_posts_query ON collected_posts(query);
