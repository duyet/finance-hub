-- Migration 0022: Household Sharing
-- Enables multiple users to share financial data with role-based permissions

-- Households table (groups of users sharing finances)
CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Household members with roles
CREATE TABLE IF NOT EXISTS household_members (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'member', 'viewer')),
  permissions TEXT DEFAULT 'read' CHECK(permissions IN ('read', 'write', 'admin')),
  joined_at TEXT DEFAULT (datetime('now')),
  invited_by TEXT,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(household_id, user_id)
);

-- Household invitations (for accepting invites)
CREATE TABLE IF NOT EXISTS household_invites (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  invited_by TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Link accounts to household (shared visibility)
CREATE TABLE IF NOT EXISTS household_accounts (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  shared_by TEXT NOT NULL,
  visibility TEXT DEFAULT 'all' CHECK(visibility IN ('all', 'owner', 'admin')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (shared_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(household_id, account_id)
);

-- Link budgets to household (shared budgeting)
CREATE TABLE IF NOT EXISTS household_budgets (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  budget_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(household_id, budget_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_household_members_household ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_household_members_user ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_household_invites_token ON household_invites(token);
CREATE INDEX IF NOT EXISTS idx_household_invites_email ON household_invites(email);
CREATE INDEX IF NOT EXISTS idx_household_accounts_household ON household_accounts(household_id);
CREATE INDEX IF NOT EXISTS idx_household_budgets_household ON household_budgets(household_id);

-- Add household_id to existing tables for shared access
ALTER TABLE users ADD COLUMN household_id TEXT REFERENCES households(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN household_id TEXT REFERENCES households(id) ON DELETE SET NULL;
ALTER TABLE goals ADD COLUMN household_id TEXT REFERENCES households(id) ON DELETE SET NULL;

-- Indexes for household queries on existing tables
CREATE INDEX IF NOT EXISTS idx_transactions_household ON transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_goals_household ON goals(household_id);
