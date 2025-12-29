-- Migration: Net worth tracking and timeline
-- Description: Track net worth over time with historical snapshots
-- Created: 2025-12-29

-- Create net worth snapshots table
CREATE TABLE IF NOT EXISTS net_worth_snapshots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  total_assets REAL DEFAULT 0,
  total_liabilities REAL DEFAULT 0,
  net_worth REAL DEFAULT 0,
  -- Asset breakdown
  cash REAL DEFAULT 0,
  investments REAL DEFAULT 0,
  property REAL DEFAULT 0,
  other_assets REAL DEFAULT 0,
  -- Liability breakdown
  credit_card_debt REAL DEFAULT 0,
  loans REAL DEFAULT 0,
  mortgage REAL DEFAULT 0,
  other_liabilities REAL DEFAULT 0,
  -- Metadata
  notes TEXT,
  is_manual INTEGER DEFAULT 0 CHECK(is_manual IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, snapshot_date)
);

-- Create indexes for net_worth_snapshots
CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_user_id ON net_worth_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_date ON net_worth_snapshots(snapshot_date);

-- Create net worth milestones table
CREATE TABLE IF NOT EXISTS net_worth_milestones (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_net_worth REAL NOT NULL,
  target_date TEXT,
  achieved_date TEXT,
  is_achieved INTEGER DEFAULT 0 CHECK(is_achieved IN (0, 1)),
  icon TEXT,
  color TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for net_worth_milestones
CREATE INDEX IF NOT EXISTS idx_net_worth_milestones_user_id ON net_worth_milestones(user_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_milestones_is_achieved ON net_worth_milestones(is_achieved);
