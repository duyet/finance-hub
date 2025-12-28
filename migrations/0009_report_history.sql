-- Migration: Report History Storage
-- Purpose: Store metadata for generated reports to provide history and re-download capability

CREATE TABLE IF NOT EXISTS report_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  report_type TEXT NOT NULL, -- 'monthly', 'annual', 'category_breakdown', 'account_statement'
  title TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  file_url TEXT, -- R2 URL if stored
  metadata TEXT, -- JSON string with filters/options used
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for fetching user's report history ordered by generation time
CREATE INDEX IF NOT EXISTS idx_report_history_user ON report_history(user_id, generated_at DESC);

-- Index for fetching specific report types
CREATE INDEX IF NOT EXISTS idx_report_history_type ON report_history(user_id, report_type, generated_at DESC);
