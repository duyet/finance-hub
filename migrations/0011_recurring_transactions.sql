-- Migration: 0011_recurring_transactions.sql
-- Description: Recurring transaction templates and automation
-- Compatibility: Cloudflare D1 (SQLite)

-- ============================================================================
-- Recurring Transactions Table
-- ============================================================================
-- Stores template configurations for automatically generated transactions
CREATE TABLE recurring_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  category_id TEXT,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,

  -- Recurrence configuration
  frequency TEXT NOT NULL CHECK(frequency IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY')),
  interval_value INTEGER DEFAULT 1, -- For "every 2 weeks", interval_value would be 2

  -- Timing configuration
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means continues indefinitely

  -- Day-of-month for monthly recurrence (1-31, or -1 for last day)
  day_of_month INTEGER CHECK(
    day_of_month IS NULL OR
    (day_of_month >= 1 AND day_of_month <= 31) OR
    day_of_month = -1
  ),

  -- Day-of-week for weekly recurrence (0=Sunday, 6=Saturday)
  day_of_week INTEGER CHECK(
    day_of_week IS NULL OR
    (day_of_week >= 0 AND day_of_week <= 6)
  ),

  -- Status flags
  is_active BOOLEAN DEFAULT 1,
  auto_generate BOOLEAN DEFAULT 1, -- Whether to auto-generate transactions

  -- Metadata
  last_generated_date DATE, -- Track when last transaction was generated
  next_generation_date DATE, -- Track when next transaction should be generated
  notes TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ============================================================================
-- Performance Indexes
-- ============================================================================

-- User's active recurring transactions
CREATE INDEX idx_recurring_user_active ON recurring_transactions(user_id, is_active) WHERE is_active = 1;

-- Next generation date queue (for background processing)
CREATE INDEX idx_recurring_next_gen ON recurring_transactions(next_generation_date)
  WHERE is_active = 1 AND auto_generate = 1;

-- Account-based filtering
CREATE INDEX idx_recurring_account ON recurring_transactions(account_id, is_active);

-- Frequency-based queries
CREATE INDEX idx_recurring_frequency ON recurring_transactions(user_id, frequency);

-- ============================================================================
-- Compound Indexes for Common Queries
-- ============================================================================

-- Upcoming recurring transactions for dashboard widget
CREATE INDEX idx_recurring_upcoming ON recurring_transactions(
  user_id,
  next_generation_date,
  is_active
) WHERE is_active = 1 AND next_generation_date IS NOT NULL;

-- Active recurring transactions by frequency
CREATE INDEX idx_recurring_active_freq ON recurring_transactions(
  user_id,
  frequency,
  is_active
) WHERE is_active = 1;

-- ============================================================================
-- Triggers for updated_at timestamp
-- ============================================================================

CREATE TRIGGER update_recurring_transactions_timestamp
AFTER UPDATE ON recurring_transactions
BEGIN
  UPDATE recurring_transactions
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;
