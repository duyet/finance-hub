-- Smart Categorization Migration
-- Stores patterns for automatic transaction categorization

CREATE TABLE IF NOT EXISTS category_patterns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pattern TEXT NOT NULL,
  pattern_type TEXT DEFAULT 'contains',
  category_id TEXT NOT NULL,
  confidence INTEGER DEFAULT 90,
  match_count INTEGER DEFAULT 0,
  last_matched TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  CHECK(pattern_type IN ('contains', 'equals', 'regex', 'fuzzy'))
);

CREATE INDEX IF NOT EXISTS idx_category_patterns_user ON category_patterns(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_category_patterns_category ON category_patterns(user_id, category_id);

-- Add auto_categorized flag to transactions
ALTER TABLE transactions ADD COLUMN auto_categorized INTEGER DEFAULT 0;
