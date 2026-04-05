CREATE TABLE IF NOT EXISTS api_usage_logs (
  id TEXT PRIMARY KEY,
  x_account_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(x_account_id, endpoint, date)
);
CREATE INDEX IF NOT EXISTS idx_usage_account_date ON api_usage_logs (x_account_id, date);
