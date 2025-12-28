-- Migration: 0010_fix_sessions_and_users_schema.sql
-- Description: Fix sessions and users schema to match db.server.ts code references
-- Compatibility: Cloudflare D1 (SQLite)
-- Issues Fixed:
--   1. Sessions table: userId -> user_id, expires -> expires_at
--   2. Sessions table: Add missing created_at column
--   3. Sessions table: Remove unused sessionToken column (code doesn't use it)
--   4. Users table: Add missing github_id, google_id, avatar_url columns
--   5. Users table: Change email_verified from DATETIME to INTEGER (boolean as 0/1)

-- ============================================================================
-- Step 1: Fix Users Table (do this first since sessions depends on it)
-- ============================================================================

-- Add missing OAuth provider columns
ALTER TABLE users ADD COLUMN github_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN google_id TEXT UNIQUE;
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- Note: email_verified needs special handling
-- Current: DATETIME (nullable, stores verification timestamp)
-- Expected: INTEGER (0 or 1, boolean flag)
-- Migration strategy: Add new column, migrate data, recreate table

-- Add new email_verified_flag column
ALTER TABLE users ADD COLUMN email_verified_flag INTEGER DEFAULT 0 NOT NULL;

-- Migrate: set flag to 1 if datetime value exists
UPDATE users SET email_verified_flag = 1 WHERE email_verified IS NOT NULL;

-- Recreate users table with correct structure
CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER DEFAULT 0 NOT NULL,
  github_id TEXT UNIQUE,
  google_id TEXT UNIQUE,
  avatar_url TEXT,
  default_currency TEXT DEFAULT 'VND',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Copy data with column mapping
INSERT INTO users_new (
  id, name, email, email_verified, github_id, google_id, avatar_url,
  default_currency, created_at, updated_at
)
SELECT
  id, name, email, email_verified_flag,
  github_id, google_id, avatar_url,
  default_currency, created_at, updated_at
FROM users;

-- Drop old and rename
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- Recreate indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_github_id ON users(github_id);
CREATE INDEX idx_users_google_id ON users(google_id);

-- ============================================================================
-- Step 2: Fix Sessions Table (after users is fixed)
-- ============================================================================

-- Rename columns
ALTER TABLE sessions RENAME COLUMN userId TO user_id;
ALTER TABLE sessions RENAME COLUMN expires TO expires_at;

-- Add missing created_at column
ALTER TABLE sessions ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Remove unused sessionToken column by recreating table
CREATE TABLE sessions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy data (excluding sessionToken)
INSERT INTO sessions_new (id, user_id, expires_at, created_at)
SELECT id, user_id, expires_at, CURRENT_TIMESTAMP
FROM sessions;

-- Drop old and rename
DROP TABLE sessions;
ALTER TABLE sessions_new RENAME TO sessions;

-- Recreate indexes with new column names
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- Verification Queries (run these after migration to verify)
-- ============================================================================
-- SELECT sql FROM sqlite_master WHERE type='table' AND name IN ('users', 'sessions');
-- PRAGMA table_info(users);
-- PRAGMA table_info(sessions);

