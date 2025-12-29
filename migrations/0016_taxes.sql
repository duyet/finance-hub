-- Migration: Create tax tracking tables
-- Description: Tracks tax lots, capital gains, and tax-related events
-- Created: 2025-12-29

-- Create tax lots table for tracking cost basis of holdings
CREATE TABLE IF NOT EXISTS tax_lots (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  holding_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  quantity REAL NOT NULL,
  acquisition_date TEXT NOT NULL,
  acquisition_price REAL NOT NULL,
  cost_basis REAL NOT NULL,
  disposition_date TEXT,
  disposition_price REAL,
  proceeds REAL DEFAULT 0,
  gain_loss REAL DEFAULT 0,
  holding_period_days INTEGER DEFAULT 0,
  is_closed INTEGER DEFAULT 0 CHECK(is_closed IN (0, 1)),
  is_wash_sale INTEGER DEFAULT 0 CHECK(is_wash_sale IN (0, 1)),
  wash_sale_replacement_lot_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for tax_lots
CREATE INDEX IF NOT EXISTS idx_tax_lots_user_id ON tax_lots(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_lots_holding_id ON tax_lots(holding_id);
CREATE INDEX IF NOT EXISTS idx_tax_lots_symbol ON tax_lots(symbol);
CREATE INDEX IF NOT EXISTS idx_tax_lots_is_closed ON tax_lots(is_closed);
CREATE INDEX IF NOT EXISTS idx_tax_lots_acquisition_date ON tax_lots(acquisition_date);
CREATE INDEX IF NOT EXISTS idx_tax_lots_disposition_date ON tax_lots(disposition_date);
CREATE INDEX IF NOT EXISTS idx_tax_lots_wash_sale ON tax_lots(is_wash_sale);

-- Create capital gains summary table
CREATE TABLE IF NOT EXISTS capital_gains_summary (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tax_year INTEGER NOT NULL,
  symbol TEXT NOT NULL,
  short_term_gain_loss REAL DEFAULT 0,
  long_term_gain_loss REAL DEFAULT 0,
  total_gain_loss REAL DEFAULT 0,
  positions_closed INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, tax_year, symbol)
);

-- Create indexes for capital_gains_summary
CREATE INDEX IF NOT EXISTS idx_capital_gains_summary_user_year ON capital_gains_summary(user_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_capital_gains_summary_symbol ON capital_gains_summary(symbol);

-- Create tax events table for tracking taxable events
CREATE TABLE IF NOT EXISTS tax_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT CHECK(event_type IN ('dividend', 'interest', 'capital_gain_distribution', 'stock_split', 'stock_dividend', 'return_of_capital', 'wash_sale', 'other')),
  symbol TEXT NOT NULL,
  event_date TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  is_reported INTEGER DEFAULT 0 CHECK(is_reported IN (0, 1)),
  tax_year INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for tax_events
CREATE INDEX IF NOT EXISTS idx_tax_events_user_id ON tax_events(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_events_type ON tax_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tax_events_date ON tax_events(event_date);
CREATE INDEX IF NOT EXISTS idx_tax_events_tax_year ON tax_events(tax_year);

-- Create tax loss harvesting opportunities table
CREATE TABLE IF NOT EXISTS tax_loss_harvesting_opportunities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  unrealized_loss REAL NOT NULL,
  unrealized_loss_percent REAL NOT NULL,
  current_value REAL NOT NULL,
  cost_basis REAL NOT NULL,
  quantity REAL NOT NULL,
  holding_period_days INTEGER NOT NULL,
  is_harvestable INTEGER DEFAULT 1 CHECK(is_harvestable IN (0, 1)),
  reason_not_harvestable TEXT,
  identified_date TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,  -- Wash sale window closes
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for tax_loss_harvesting_opportunities
CREATE INDEX IF NOT EXISTS idx_tax_loss_harvesting_user_id ON tax_loss_harvesting_opportunities(user_id);
CREATE INDEX IF NOT EXISTS idx_tax_loss_harvesting_symbol ON tax_loss_harvesting_opportunities(symbol);
CREATE INDEX IF NOT EXISTS idx_tax_loss_harvesting_expires_at ON tax_loss_harvesting_opportunities(expires_at);

-- Create tax preferences table
CREATE TABLE IF NOT EXISTS tax_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  tax_jurisdiction TEXT DEFAULT 'US',
  default_tax_year INTEGER DEFAULT EXTRACT('year', CURRENT_DATE),
  short_term_threshold_days INTEGER DEFAULT 365,
  enable_wash_sale_detection INTEGER DEFAULT 1 CHECK(enable_wash_sale_detection IN (0, 1)),
  wash_sale_window_days INTEGER DEFAULT 30,
  auto_harvest_losses INTEGER DEFAULT 0 CHECK(auto_harvest_losses IN (0, 1)),
  harvest_threshold_percent REAL DEFAULT 5.0,
  min_harvest_amount REAL DEFAULT 1000,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for tax_preferences
CREATE INDEX IF NOT EXISTS idx_tax_preferences_user_id ON tax_preferences(user_id);

-- Insert default preferences for existing users
INSERT OR IGNORE INTO tax_preferences (id, user_id)
SELECT
  lower(hex(randomblob(16))),
  id
FROM users;
