-- Migration: Create receipts table for OCR functionality
-- This migration adds support for storing receipt images and OCR-extracted data

-- Create receipts table
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'needs_review')),
  extracted_data TEXT NOT NULL, -- JSON
  confidence REAL NOT NULL DEFAULT 0,
  error_message TEXT,
  transaction_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_id ON receipts(transaction_id);

-- Add receipt_url column to transactions table if not exists
-- This allows linking existing transactions to receipts
ALTER TABLE transactions ADD COLUMN receipt_url TEXT;

-- Create index for receipt lookups
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_url ON transactions(receipt_url);

-- Insert migration record
INSERT OR IGNORE INTO schema_migrations (name, executed_at)
VALUES ('create_receipts_table_2024_12_28', datetime('now'));
