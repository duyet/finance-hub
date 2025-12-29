-- Migration: 0012_financial_goals.sql
-- Description: Financial goals for savings and debt payoff targets
-- Compatibility: Cloudflare D1 (SQLite)

-- Financial goals table
CREATE TABLE IF NOT EXISTS financial_goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_amount REAL NOT NULL,
  current_amount REAL DEFAULT 0,
  category_id TEXT,                    -- Optional: link to expense category for spending-based goals
  goal_type TEXT NOT NULL CHECK(goal_type IN ('savings', 'debt_payoff', 'expense_limit')),
  target_date DATE,
  start_date DATE NOT NULL DEFAULT (DATE('now')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'paused', 'cancelled')),
  priority INTEGER DEFAULT 0 CHECK(priority >= 0 AND priority <= 10),
  icon TEXT,
  color_theme TEXT,
  auto_track BOOLEAN DEFAULT 1,         -- Auto-update from transactions
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Index for user goal queries
CREATE INDEX IF NOT EXISTS idx_financial_goals_userId ON financial_goals(user_id);

-- Index for active goals by status
CREATE INDEX IF NOT EXISTS idx_financial_goals_status ON financial_goals(user_id, status);

-- Index for goal type filtering
CREATE INDEX IF NOT EXISTS idx_financial_goals_type ON financial_goals(user_id, goal_type);

-- Index for target date queries (upcoming goals)
CREATE INDEX IF NOT EXISTS idx_financial_goals_targetDate ON financial_goals(user_id, target_date)
  WHERE target_date IS NOT NULL;

-- Index for auto-tracked goals by category
CREATE INDEX IF NOT EXISTS idx_financial_goals_category ON financial_goals(category_id, auto_track)
  WHERE category_id IS NOT NULL AND auto_track = 1;
