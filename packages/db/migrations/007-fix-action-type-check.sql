-- SQLite doesn't support ALTER CHECK, so we recreate the table
-- Preserve all data during migration

CREATE TABLE engagement_gates_new (
  id TEXT PRIMARY KEY,
  x_account_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('like', 'repost', 'reply', 'follow', 'quote')),
  action_type TEXT NOT NULL CHECK (action_type IN ('mention_post', 'dm', 'verify_only')),
  template TEXT NOT NULL,
  link TEXT,
  is_active INTEGER DEFAULT 1,
  line_harness_url TEXT,
  line_harness_api_key TEXT,
  line_harness_tag TEXT,
  line_harness_scenario_id TEXT,
  lottery_enabled INTEGER DEFAULT 0,
  lottery_rate INTEGER DEFAULT 100,
  lottery_win_template TEXT,
  lottery_lose_template TEXT,
  polling_strategy TEXT DEFAULT 'hot_window' CHECK (polling_strategy IN ('hot_window', 'constant', 'manual')),
  expires_at TEXT,
  next_poll_at TEXT,
  api_calls_total INTEGER DEFAULT 0,
  require_like INTEGER DEFAULT 0,
  require_repost INTEGER DEFAULT 0,
  require_follow INTEGER DEFAULT 0,
  last_reply_since_id TEXT,
  reply_keyword TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO engagement_gates_new SELECT
  id, x_account_id, post_id, trigger_type, action_type, template, link,
  is_active, line_harness_url, line_harness_api_key, line_harness_tag,
  line_harness_scenario_id, lottery_enabled, lottery_rate, lottery_win_template,
  lottery_lose_template, polling_strategy, expires_at, next_poll_at,
  api_calls_total, require_like, require_repost, require_follow,
  last_reply_since_id, reply_keyword, created_at, updated_at
FROM engagement_gates;

DROP TABLE engagement_gates;
ALTER TABLE engagement_gates_new RENAME TO engagement_gates;

CREATE INDEX IF NOT EXISTS idx_engagement_gates_active ON engagement_gates(is_active);
CREATE INDEX IF NOT EXISTS idx_engagement_gates_next_poll ON engagement_gates(next_poll_at, is_active);
