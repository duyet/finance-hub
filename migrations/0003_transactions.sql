-- Migration: 0003_transactions.sql
-- Description: Transactions table with performance indexes
-- Compatibility: Cloudflare D1 (SQLite)

-- ============================================================================
-- Transactions Table
-- ============================================================================
-- Core financial transaction ledger
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  category_id TEXT,
  date DATETIME NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  merchant_name TEXT,
  status TEXT CHECK(status IN ('PENDING', 'POSTED', 'CLEARED', 'RECONCILED')) DEFAULT 'POSTED',
  reference_number TEXT,
  receipt_url TEXT,
  notes TEXT,
  is_split BOOLEAN DEFAULT 0,
  is_recurring BOOLEAN DEFAULT 0,
  recurring_transaction_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE RESTRICT,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- ============================================================================
-- Performance Indexes for Dashboard Queries
-- ============================================================================

-- Primary index: Dashboard queries by user and date (most common query pattern)
-- Supports: "Show me my transactions for this month, ordered by date"
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);

-- Account transaction history lookup
-- Supports: "Show me all transactions for this specific account"
CREATE INDEX idx_transactions_account_date ON transactions(account_id, date DESC);

-- Category-based filtering and reporting
-- Supports: "Show me all expenses in the 'Food' category"
CREATE INDEX idx_transactions_category_date ON transactions(category_id, date DESC) WHERE category_id IS NOT NULL;

-- Status filtering (pending vs posted transactions)
-- Supports: "Show me all pending transactions"
CREATE INDEX idx_transactions_status ON transactions(user_id, status, date DESC);

-- Search optimization: description full-text search
-- Supports: "Search for transactions containing 'Grab'"
CREATE INDEX idx_transactions_description ON transactions(description COLLATE NOCASE);

-- Bank sync deduplication: reference number uniqueness
-- Supports: "Prevent duplicate transaction imports from bank webhooks"
CREATE INDEX idx_transactions_reference ON transactions(reference_number) WHERE reference_number IS NOT NULL;

-- ============================================================================
-- Compound Indexes for Common Query Patterns
-- ============================================================================

-- Dashboard: recent transactions across all accounts
CREATE INDEX idx_transactions_dashboard ON transactions(user_id, date DESC, created_at DESC);

-- Reports: income vs expense by date range
CREATE INDEX idx_transactions_reports ON transactions(user_id, date, amount);

-- Reconciled transactions filter
CREATE INDEX idx_transactions_reconciled ON transactions(user_id, status, date) WHERE status = 'RECONCILED';

-- Receipt-only transactions filter
CREATE INDEX idx_transactions_receipts ON transactions(user_id, receipt_url) WHERE receipt_url IS NOT NULL;

-- Split transactions parent lookup
CREATE INDEX idx_transactions_split ON transactions(is_split, user_id) WHERE is_split = 1;

-- Recurring transactions lookup
CREATE INDEX idx_transactions_recurring ON transactions(recurring_transaction_id) WHERE recurring_transaction_id IS NOT NULL;
