-- Migration: 0002_financial_entities.sql
-- Description: Core Financial Entities
-- Compatibility: Cloudflare D1 (SQLite)

-- ============================================================================
-- Financial Accounts Table
-- ============================================================================
-- Polymorphic parent for all asset types (Bank, Cash, Credit, Loan, etc.)
CREATE TABLE financial_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'LOAN', 'WALLET', 'INVESTMENT')),
  currency TEXT DEFAULT 'VND',
  current_balance REAL DEFAULT 0,
  institution_name TEXT,
  account_number_last4 TEXT,
  color_theme TEXT,
  is_archived BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for user's accounts lookup (dashboard)
CREATE INDEX idx_financial_accounts_userId ON financial_accounts(user_id);

-- Index for account type filtering
CREATE INDEX idx_financial_accounts_type ON financial_accounts(user_id, type);

-- Index for active accounts only (excludes archived)
CREATE INDEX idx_financial_accounts_active ON financial_accounts(user_id, is_archived) WHERE is_archived = 0;

-- ============================================================================
-- Categories Table
-- ============================================================================
-- Income and expense categories with optional budget limits
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
  parent_id TEXT,
  budget_limit REAL,
  color_theme TEXT,
  icon TEXT,
  is_system BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Unique constraint: category names must be unique per user and type
CREATE UNIQUE INDEX idx_categories_user_name ON categories(user_id, name, type) WHERE parent_id IS NULL;

-- Index for user's categories lookup (transaction categorization)
CREATE INDEX idx_categories_userId ON categories(user_id);

-- Index for category type filtering (income vs expense reports)
CREATE INDEX idx_categories_type ON categories(user_id, type);

-- Index for parent-child relationships (nested categories)
CREATE INDEX idx_categories_parentId ON categories(parent_id) WHERE parent_id IS NOT NULL;

-- Index for budget tracking (categories with budgets)
CREATE INDEX idx_categories_budget ON categories(user_id, budget_limit) WHERE budget_limit IS NOT NULL;
