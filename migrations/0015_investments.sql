-- Migration: Create investment tables
-- Description: Stores investment accounts, holdings, and transactions
-- Created: 2025-12-29

-- Create investment accounts table
CREATE TABLE IF NOT EXISTS investment_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  institution TEXT,
  account_type TEXT CHECK(account_type IN ('brokerage', 'retirement', 'ira', '401k', 'roth_ira', 'custodial', 'trust', 'crypto', 'other')),
  currency TEXT DEFAULT 'VND',
  is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
  balance REAL DEFAULT 0,
  total_cost_basis REAL DEFAULT 0,
  total_value REAL DEFAULT 0,
  total_gain_loss REAL DEFAULT 0,
  total_gain_loss_percent REAL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,  -- JSON for additional data
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for investment_accounts
CREATE INDEX IF NOT EXISTS idx_investment_accounts_user_id ON investment_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_accounts_type ON investment_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_investment_accounts_active ON investment_accounts(is_active);

-- Create investment holdings table
CREATE TABLE IF NOT EXISTS investment_holdings (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT CHECK(asset_type IN ('stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'option', 'future', 'index', 'commodity', 'forex', 'other')),
  quantity REAL NOT NULL,
  avg_cost_basis REAL NOT NULL,
  current_price REAL DEFAULT 0,
  current_value REAL DEFAULT 0,
  cost_basis REAL DEFAULT 0,
  gain_loss REAL DEFAULT 0,
  gain_loss_percent REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  exchange TEXT DEFAULT 'US',  -- NYSE, NASDAQ, etc.
  country TEXT DEFAULT 'US',
  is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
  first_purchase_date TEXT,
  last_update TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,  -- JSON for additional data like sector, industry, dividend_yield
  FOREIGN KEY (account_id) REFERENCES investment_accounts(id) ON DELETE CASCADE
);

-- Create indexes for investment_holdings
CREATE INDEX IF NOT EXISTS idx_investment_holdings_account_id ON investment_holdings(account_id);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_symbol ON investment_holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_asset_type ON investment_holdings(asset_type);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_active ON investment_holdings(is_active);
CREATE INDEX IF NOT EXISTS idx_investment_holdings_user_id ON investment_holdings(account_id);

-- Create investment transactions table
CREATE TABLE IF NOT EXISTS investment_transactions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  holding_id TEXT,  -- Optional, null for deposits/withdrawals
  transaction_type TEXT CHECK(transaction_type IN ('buy', 'sell', 'dividend', 'interest', 'deposit', 'withdrawal', 'split', 'transfer_in', 'transfer_out', 'reinvest_dividend', 'fee', 'tax', 'other')),
  symbol TEXT,
  quantity REAL DEFAULT 0,
  price REAL DEFAULT 0,
  total_amount REAL NOT NULL,
  commission REAL DEFAULT 0,
  fees REAL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  transaction_date TEXT NOT NULL,
  settlement_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,  -- JSON for additional data
  FOREIGN KEY (account_id) REFERENCES investment_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (holding_id) REFERENCES investment_holdings(id) ON DELETE SET NULL
);

-- Create indexes for investment_transactions
CREATE INDEX IF NOT EXISTS idx_investment_transactions_account_id ON investment_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_holding_id ON investment_transactions(holding_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_type ON investment_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_date ON investment_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_symbol ON investment_transactions(symbol);

-- Create investment performance snapshots table (for tracking historical performance)
CREATE TABLE IF NOT EXISTS investment_snapshots (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  total_value REAL NOT NULL,
  total_cost_basis REAL NOT NULL,
  total_gain_loss REAL NOT NULL,
  total_gain_loss_percent REAL NOT NULL,
  day_change REAL DEFAULT 0,
  day_change_percent REAL DEFAULT 0,
  cash_balance REAL DEFAULT 0,
  holdings_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (account_id) REFERENCES investment_accounts(id) ON DELETE CASCADE,
  UNIQUE(account_id, snapshot_date)
);

-- Create indexes for investment_snapshots
CREATE INDEX IF NOT EXISTS idx_investment_snapshots_account_id ON investment_snapshots(account_id);
CREATE INDEX IF NOT EXISTS idx_investment_snapshots_date ON investment_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_investment_snapshots_account_date ON investment_snapshots(account_id, snapshot_date DESC);

-- Create investment watchlist table
CREATE TABLE IF NOT EXISTS investment_watchlist (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT,
  asset_type TEXT CHECK(asset_type IN ('stock', 'etf', 'mutual_fund', 'bond', 'crypto', 'option', 'future', 'index', 'commodity', 'forex', 'other')),
  target_price REAL,
  notes TEXT,
  alert_enabled INTEGER DEFAULT 0 CHECK(alert_enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, symbol)
);

-- Create indexes for investment_watchlist
CREATE INDEX IF NOT EXISTS idx_investment_watchlist_user_id ON investment_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_watchlist_symbol ON investment_watchlist(symbol);
