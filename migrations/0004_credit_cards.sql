-- Migration: 0004_credit_cards.sql
-- Description: Credit Card Management System
-- Compatibility: Cloudflare D1 (SQLite)

-- ============================================================================
-- Credit Card Configs Table
-- ============================================================================
-- Stores credit card specific configuration (billing cycle, limits, rates)
CREATE TABLE credit_card_configs (
  account_id TEXT PRIMARY KEY,
  statement_day INTEGER NOT NULL CHECK(statement_day BETWEEN 1 AND 31),
  payment_due_day_offset INTEGER NOT NULL CHECK(payment_due_day_offset > 0),
  credit_limit REAL NOT NULL,
  apr REAL CHECK(apr >= 0),
  annual_fee REAL DEFAULT 0,
  grace_period_days INTEGER DEFAULT 21,
  interest_free_period_days INTEGER DEFAULT 45,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE
);

-- ============================================================================
-- Credit Card Statements Table
-- ============================================================================
-- Tracks billing cycles, balances, and payment status
CREATE TABLE credit_card_statements (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  cycle_start_date DATE NOT NULL,
  cycle_end_date DATE NOT NULL,
  statement_date DATE NOT NULL,
  due_date DATE NOT NULL,
  opening_balance REAL NOT NULL DEFAULT 0,
  closing_balance REAL NOT NULL DEFAULT 0,
  total_charges REAL DEFAULT 0,
  total_payments REAL DEFAULT 0,
  total_fees REAL DEFAULT 0,
  minimum_payment REAL,
  payment_status TEXT CHECK(payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE')) DEFAULT 'UNPAID',
  amount_paid REAL DEFAULT 0,
  paid_at DATETIME,
  pdf_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE
);

-- Index for account statement history lookup
CREATE INDEX idx_credit_card_statements_account ON credit_card_statements(account_id, statement_date DESC);

-- Index for active statements (unpaid/partial payment)
CREATE INDEX idx_credit_card_statements_active ON credit_card_statements(account_id, payment_status) WHERE payment_status IN ('UNPAID', 'PARTIAL');

-- Index for due date reminders (upcoming payments)
CREATE INDEX idx_credit_card_statements_due ON credit_card_statements(due_date, payment_status) WHERE payment_status IN ('UNPAID', 'PARTIAL');

-- Index for current cycle lookup
CREATE INDEX idx_credit_card_statements_cycle ON credit_card_statements(account_id, cycle_end_date DESC) WHERE payment_status = 'UNPAID';

-- Unique constraint: Prevent duplicate statements for the same cycle
CREATE UNIQUE INDEX idx_credit_card_statements_cycle_unique ON credit_card_statements(account_id, cycle_start_date, cycle_end_date);

-- ============================================================================
-- Credit Card Transactions Mapping Table
-- ============================================================================
-- Links transactions to specific statements for reconciliation
CREATE TABLE credit_card_statement_transactions (
  id TEXT PRIMARY KEY,
  statement_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  included_in_statement BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (statement_id) REFERENCES credit_card_statements(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Unique constraint: Each transaction can only appear once per statement
CREATE UNIQUE INDEX idx_cc_stmt_tx_unique ON credit_card_statement_transactions(statement_id, transaction_id);

-- Index for statement transaction lookup
CREATE INDEX idx_cc_stmt_tx_statement ON credit_card_statement_transactions(statement_id);

-- Index for transaction statement lookup (reverse lookup)
CREATE INDEX idx_cc_stmt_tx_transaction ON credit_card_statement_transactions(transaction_id);
