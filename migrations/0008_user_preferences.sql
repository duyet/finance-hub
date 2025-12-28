-- Migration: 0008_user_preferences.sql
-- Description: Add user preferences columns to users table
-- Compatibility: Cloudflare D1 (SQLite)

-- Add language preference column (default: 'en')
ALTER TABLE users ADD COLUMN language TEXT DEFAULT 'en' CHECK(language IN ('en', 'vi'));

-- Add date format preference column (default: 'DD/MM/YYYY')
ALTER TABLE users ADD COLUMN date_format TEXT DEFAULT 'DD/MM/YYYY';

-- Add currency format preference column (default: 'symbol')
ALTER TABLE users ADD COLUMN currency_format TEXT DEFAULT 'symbol' CHECK(currency_format IN ('symbol', 'code', 'compact'));

-- Add theme preference column (default: 'system')
ALTER TABLE users ADD COLUMN theme TEXT DEFAULT 'system' CHECK(theme IN ('light', 'dark', 'system'));

-- Create index for language-based queries
CREATE INDEX IF NOT EXISTS idx_users_language ON users(language);

-- Insert migration record
INSERT OR IGNORE INTO schema_migrations (name, executed_at)
VALUES ('0008_user_preferences', datetime('now'));
