-- Anomaly Detection Migration
-- Stores detected spending anomalies for review

CREATE TABLE IF NOT EXISTS spending_anomalies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  anomaly_date TEXT NOT NULL,
  amount REAL NOT NULL,
  expected_amount REAL NOT NULL,
  deviation_percent REAL NOT NULL,
  z_score REAL NOT NULL,
  anomaly_score REAL NOT NULL,
  category TEXT NOT NULL,
  reasons TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  is_reviewed INTEGER DEFAULT 0,
  reviewed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  CHECK(severity IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_spending_anomalies_user_date ON spending_anomalies(user_id, anomaly_date);
CREATE INDEX IF NOT EXISTS idx_spending_anomalies_user_reviewed ON spending_anomalies(user_id, is_reviewed);
CREATE INDEX IF NOT EXISTS idx_spending_anomalies_severity ON spending_anomalies(user_id, severity);
