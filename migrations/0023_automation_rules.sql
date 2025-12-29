-- Migration 0023: Automation Rules Engine
-- Enables users to create custom automation rules for transactions

-- Automation rules with condition-action pairs
CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  trigger_type TEXT NOT NULL CHECK(trigger_type IN ('transaction_created', 'transaction_updated', 'category_changed', 'amount_changed', 'scheduled')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_triggered_at TEXT,
  trigger_count INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Rule conditions (the "IF" part)
CREATE TABLE IF NOT EXISTS rule_conditions (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  field TEXT NOT NULL CHECK(field IN ('amount', 'description', 'category', 'date', 'account_id', 'transaction_type')),
  operator TEXT NOT NULL CHECK(operator IN ('equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'between', 'in', 'not_in', 'regex')),
  value TEXT NOT NULL, -- JSON for complex values (arrays, ranges, etc.)
  value_type TEXT DEFAULT 'string' CHECK(value_type IN ('string', 'number', 'boolean', 'json', 'date')),
  condition_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE
);

-- Rule actions (the "THEN" part)
CREATE TABLE IF NOT EXISTS rule_actions (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK(action_type IN ('categorize', 'add_tag', 'remove_tag', 'set_flag', 'send_notification', 'add_note', 'split_transaction', 'round_amount', 'skip_budget')),
  action_config TEXT NOT NULL, -- JSON configuration for the action
  action_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE
);

-- Rule execution log
CREATE TABLE IF NOT EXISTS rule_executions (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  triggered_at TEXT DEFAULT (datetime('now')),
  success INTEGER DEFAULT 1,
  error_message TEXT,
  actions_taken TEXT, -- JSON array of actions performed
  FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Scheduled rules configuration
CREATE TABLE IF NOT EXISTS scheduled_rules (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL UNIQUE,
  schedule_type TEXT NOT NULL CHECK(schedule_type IN ('daily', 'weekly', 'monthly', 'cron')),
  schedule_value TEXT, -- Day of week (1-7), day of month (1-31), or cron expression
  last_run_at TEXT,
  next_run_at TEXT,
  FOREIGN KEY (rule_id) REFERENCES automation_rules(id) ON DELETE CASCADE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_automation_rules_user ON automation_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_active ON automation_rules(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type, is_active);
CREATE INDEX IF NOT EXISTS idx_rule_conditions_rule ON rule_conditions(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_actions_rule ON rule_actions(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_rule ON rule_executions(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_executions_transaction ON rule_executions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_rules_next_run ON scheduled_rules(next_run_at);
