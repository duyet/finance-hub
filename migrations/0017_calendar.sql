-- Migration: Calendar sync for reminders and events
-- Description: Export financial reminders to external calendars via iCalendar
-- Created: 2025-12-29

-- Create calendar subscriptions table
CREATE TABLE IF NOT EXISTS calendar_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  calendar_type TEXT CHECK(calendar_type IN ('google', 'outlook', 'apple', 'other')),
  subscription_url TEXT,
  secret_token TEXT NOT NULL UNIQUE,
  include_bill_reminders INTEGER DEFAULT 1 CHECK(include_bill_reminders IN (0, 1)),
  include_goal_reminders INTEGER DEFAULT 1 CHECK(include_goal_reminders IN (0, 1)),
  include_recurring_transactions INTEGER DEFAULT 1 CHECK(include_recurring_transactions IN (0, 1)),
  include_debt_payments INTEGER DEFAULT 1 CHECK(include_debt_payments IN (0, 1)),
  include_custom_reminders INTEGER DEFAULT 1 CHECK(include_custom_reminders IN (0, 1)),
  days_ahead INTEGER DEFAULT 7,
  is_active INTEGER DEFAULT 1 CHECK(is_active IN (0, 1)),
  last_accessed_at TEXT,
  access_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for calendar_subscriptions
CREATE INDEX IF NOT EXISTS idx_calendar_subscriptions_user_id ON calendar_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_subscriptions_secret_token ON calendar_subscriptions(secret_token);
CREATE INDEX IF NOT EXISTS idx_calendar_subscriptions_is_active ON calendar_subscriptions(is_active);

-- Create calendar events table for synced events
CREATE TABLE IF NOT EXISTS calendar_events (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  event_type TEXT CHECK(event_type IN ('bill_reminder', 'goal_reminder', 'recurring_transaction', 'debt_payment', 'custom_reminder')),
  source_id TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_description TEXT,
  event_start TEXT NOT NULL,
  event_end TEXT NOT NULL,
  all_day INTEGER DEFAULT 1 CHECK(all_day IN (0, 1)),
  location TEXT,
  ical_uid TEXT NOT NULL UNIQUE,
  ical_sequence INTEGER DEFAULT 0,
  synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  FOREIGN KEY (subscription_id) REFERENCES calendar_subscriptions(id) ON DELETE CASCADE
);

-- Create indexes for calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_subscription_id ON calendar_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_source_id ON calendar_events(source_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_ical_uid ON calendar_events(ical_uid);
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_start ON calendar_events(event_start);
