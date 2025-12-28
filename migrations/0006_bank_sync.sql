-- Migration: 0006_bank_sync.sql
-- Description: Bank sync webhook tracking and configuration
-- Compatibility: Cloudflare D1 (SQLite)

-- ============================================================================
-- Bank Sync Configurations Table
-- ============================================================================
-- Stores webhook configuration for bank sync providers
CREATE TABLE bank_sync_configs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('casso', 'sepay')),
  api_key TEXT,
  webhook_secret TEXT,
  webhook_url TEXT,
  is_enabled BOOLEAN DEFAULT 1,
  last_sync_at DATETIME,
  sync_status TEXT CHECK(sync_status IN ('active', 'error', 'paused')) DEFAULT 'active',
  last_error TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Unique constraint: one config per user per provider
CREATE UNIQUE INDEX idx_bank_sync_configs_user_provider ON bank_sync_configs(user_id, provider);

-- Index for active syncs
CREATE INDEX idx_bank_sync_configs_active ON bank_sync_configs(user_id, is_enabled) WHERE is_enabled = 1;

-- ============================================================================
-- Webhook Events Table
-- ============================================================================
-- Tracks all incoming webhook events for audit and debugging
CREATE TABLE webhook_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('casso', 'sepay')),
  event_type TEXT NOT NULL,
  payload TEXT NOT NULL,
  signature TEXT,
  status TEXT CHECK(status IN ('pending', 'processing', 'success', 'failed', 'duplicate')) DEFAULT 'pending',
  error_message TEXT,
  transactions_created INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  received_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for user's webhook history
CREATE INDEX idx_webhook_events_user ON webhook_events(user_id, received_at DESC);

-- Index for status filtering
CREATE INDEX idx_webhook_events_status ON webhook_events(user_id, status, received_at DESC);

-- Index for provider filtering
CREATE INDEX idx_webhook_events_provider ON webhook_events(user_id, provider, received_at DESC);

-- ============================================================================
-- Bank Accounts Table (for linked bank accounts)
-- ============================================================================
-- Stores linked bank account information from providers
CREATE TABLE bank_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('casso', 'sepay')),
  bank_name TEXT NOT NULL,
  account_number TEXT,
  account_name TEXT,
  account_type TEXT,
  currency TEXT DEFAULT 'VND',
  is_active BOOLEAN DEFAULT 1,
  provider_account_id TEXT,
  financial_account_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (financial_account_id) REFERENCES financial_accounts(id) ON DELETE SET NULL
);

-- Unique constraint: one bank account per provider account
CREATE UNIQUE INDEX idx_bank_accounts_provider_account ON bank_accounts(user_id, provider, provider_account_id);

-- Index for active bank accounts
CREATE INDEX idx_bank_accounts_active ON bank_accounts(user_id, is_active) WHERE is_active = 1;

-- Index for financial account lookup
CREATE INDEX idx_bank_accounts_financial ON bank_accounts(financial_account_id) WHERE financial_account_id IS NOT NULL;
