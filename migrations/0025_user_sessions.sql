-- Migration 0025: User Session Management
-- Adds active session tracking and login history

-- Active user sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL, -- Hashed session token
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT, -- mobile, tablet, desktop, unknown
  browser TEXT,
  os TEXT,
  last_active_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT,
  is_revoked INTEGER DEFAULT 0,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Login history (audit log)
CREATE TABLE IF NOT EXISTS login_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  login_type TEXT NOT NULL CHECK(login_type IN ('password', '2fa', 'backup_code', 'social', 'sso')),
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  success INTEGER DEFAULT 1,
  failure_reason TEXT,
  two_factor_used INTEGER DEFAULT 0,
  location TEXT, -- Country/city from IP
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Security events (for monitoring)
CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL CHECK(event_type IN ('password_change', 'email_change', '2fa_enabled', '2fa_disabled', '2fa_verified', 'session_revoked', 'all_sessions_revoked', 'suspicious_activity', 'login_attempt_failed', 'backup_code_used')),
  ip_address TEXT,
  user_agent TEXT,
  metadata TEXT, -- JSON for event-specific data
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(user_id, is_revoked, expires_at);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created ON login_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON security_events(created_at DESC);
