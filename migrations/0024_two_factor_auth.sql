-- Migration 0024: Two-Factor Authentication (2FA)
-- Adds TOTP-based two-factor authentication for enhanced security

-- 2FA settings per user
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  is_enabled INTEGER DEFAULT 0,
  secret TEXT NOT NULL, -- TOTP secret (encrypted at rest)
  backup_codes TEXT, -- JSON array of backup codes (encrypted)
  verified_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2FA login sessions (verification in progress)
CREATE TABLE IF NOT EXISTS two_factor_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  challenge TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  verified_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_2fa_user ON two_factor_auth(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_sessions_user ON two_factor_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_2fa_sessions_challenge ON two_factor_sessions(challenge);
