-- Migration: Create notifications table
-- Description: Stores user notifications and reminders for various financial events
-- Created: 2025-12-29

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('reminder', 'alert', 'info', 'success', 'warning')),
  category TEXT CHECK(category IN ('payment_due', 'recurring_transaction', 'budget_alert', 'goal_milestone', 'debt_payment', 'low_balance', 'large_expense', 'goal_deadline', 'custom')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  is_read INTEGER DEFAULT 0 CHECK(is_read IN (0, 1)),
  is_dismissed INTEGER DEFAULT 0 CHECK(is_dismissed IN (0, 1)),
  action_required INTEGER DEFAULT 0 CHECK(action_required IN (0, 1)),
  due_date TEXT,  -- ISO 8601 date string for reminders
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT,
  dismissed_at TEXT,
  metadata TEXT,  -- JSON for additional data
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_dismissed ON notifications(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_due_date ON notifications(due_date);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);

-- Create index for unread notifications query
CREATE INDEX IF NOT EXISTS idx_notifications_unread_user ON notifications(user_id, is_read, is_dismissed, created_at DESC);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  email_enabled INTEGER DEFAULT 1 CHECK(email_enabled IN (0, 1)),
  push_enabled INTEGER DEFAULT 1 CHECK(push_enabled IN (0, 1)),
  in_app_enabled INTEGER DEFAULT 1 CHECK(in_app_enabled IN (0, 1)),
  payment_due_reminder_days INTEGER DEFAULT 3,  -- Days before due date
  budget_alert_threshold REAL DEFAULT 0.8,  -- 80% of budget
  low_balance_threshold REAL DEFAULT 1000.0,  -- Minimum balance threshold
  large_expense_threshold REAL DEFAULT 5000000.0,  -- 5 million VND
  goal_milestone_reminder INTEGER DEFAULT 1 CHECK(goal_milestone_reminder IN (0, 1)),
  recurring_transaction_reminder INTEGER DEFAULT 1 CHECK(recurring_transaction_reminder IN (0, 1)),
  debt_payment_reminder INTEGER DEFAULT 1 CHECK(debt_payment_reminder IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Insert default preferences for existing users (will be triggered automatically for new users)
INSERT OR IGNORE INTO notification_preferences (id, user_id)
SELECT
  lower(hex(randomblob(16))),
  id
FROM users;
