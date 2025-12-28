-- Migration: 0001_users.sql
-- Description: Users and Authentication tables
-- Compatibility: Cloudflare D1 (SQLite)

-- ============================================================================
-- Users Table
-- ============================================================================
-- Core user account information with multi-currency support
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  email_verified DATETIME,
  image TEXT,
  default_currency TEXT DEFAULT 'VND',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for email lookups (authentication)
CREATE INDEX idx_users_email ON users(email);

-- ============================================================================
-- Accounts Table (OAuth Providers)
-- ============================================================================
-- Stores OAuth provider connections (Google, GitHub, etc.)
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL CHECK(provider IN ('google', 'github', 'email')),
  providerAccountId TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Unique constraint to prevent duplicate OAuth account linking
CREATE UNIQUE INDEX idx_accounts_provider_account ON accounts(provider, providerAccountId);

-- Index for user's OAuth accounts lookup
CREATE INDEX idx_accounts_userId ON accounts(userId);

-- ============================================================================
-- Sessions Table
-- ============================================================================
-- Session management for authentication
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  sessionToken TEXT NOT NULL UNIQUE,
  userId TEXT NOT NULL,
  expires DATETIME NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for session token lookups (authentication validation)
CREATE INDEX idx_sessions_sessionToken ON sessions(sessionToken);

-- Index for user sessions lookup (session management)
CREATE INDEX idx_sessions_userId ON sessions(userId);

-- Index for expired session cleanup
CREATE INDEX idx_sessions_expires ON sessions(expires);
