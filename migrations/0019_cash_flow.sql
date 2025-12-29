-- Cash Flow Forecasting Migration
-- Stores future cash balance predictions and low balance alerts

CREATE TABLE IF NOT EXISTS cash_flow_predictions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prediction_date TEXT NOT NULL DEFAULT (datetime('now')),
  forecast_date TEXT NOT NULL,
  opening_balance REAL DEFAULT 0,
  expected_income REAL DEFAULT 0,
  expected_expenses REAL DEFAULT 0,
  closing_balance REAL DEFAULT 0,
  confidence_level REAL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_cash_flow_predictions_user_forecast ON cash_flow_predictions(user_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_cash_flow_predictions_user_date ON cash_flow_predictions(user_id, prediction_date);

CREATE TABLE IF NOT EXISTS cash_flow_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  alert_date TEXT NOT NULL,
  predicted_balance REAL NOT NULL,
  threshold REAL NOT NULL,
  severity TEXT DEFAULT 'warning',
  is_resolved INTEGER DEFAULT 0,
  resolved_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK(severity IN ('warning', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_cash_flow_alerts_user_date ON cash_flow_alerts(user_id, alert_date);
CREATE INDEX IF NOT EXISTS idx_cash_flow_alerts_user_resolved ON cash_flow_alerts(user_id, is_resolved);
