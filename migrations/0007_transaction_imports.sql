-- Migration: 0007_transaction_imports.sql
-- Description: CSV transaction import tracking
-- Compatibility: Cloudflare D1 (SQLite)

-- ============================================================================
-- Transaction Imports Table
-- ============================================================================
-- Tracks CSV import jobs for async processing
CREATE TABLE transaction_imports (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'partial')),
  column_mapping TEXT, -- JSON
  import_options TEXT, -- JSON
  total_rows INTEGER DEFAULT 0,
  imported_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  error_summary TEXT, -- JSON array of errors
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for user's import history
CREATE INDEX idx_transaction_imports_user ON transaction_imports(user_id, created_at DESC);

-- Index for status filtering
CREATE INDEX idx_transaction_imports_status ON transaction_imports(user_id, status, created_at DESC);

-- ============================================================================
-- Import Errors Table
-- ============================================================================
-- Detailed error tracking for CSV imports
CREATE TABLE transaction_import_errors (
  id TEXT PRIMARY KEY,
  import_id TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  field TEXT,
  value TEXT,
  error_message TEXT NOT NULL,
  error_type TEXT CHECK(error_type IN ('validation', 'parsing', 'database', 'duplicate')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (import_id) REFERENCES transaction_imports(id) ON DELETE CASCADE
);

-- Index for import error lookup
CREATE INDEX idx_import_errors_import ON transaction_import_errors(import_id, row_number);

-- Insert migration record
INSERT OR IGNORE INTO schema_migrations (name, executed_at)
VALUES ('0007_transaction_imports', datetime('now'));
