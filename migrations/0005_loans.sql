-- Migration: 0005_loans.sql
-- Description: Loan Management with Floating Interest Support
-- Compatibility: Cloudflare D1 (SQLite)

-- ============================================================================
-- Loans Table
-- ============================================================================
-- Core loan configuration and terms
CREATE TABLE loans (
  account_id TEXT PRIMARY KEY,
  principal_original REAL NOT NULL,
  principal_outstanding REAL NOT NULL,
  start_date DATE NOT NULL,
  term_months INTEGER NOT NULL CHECK(term_months > 0),
  interest_calculation_method TEXT CHECK(interest_calculation_method IN ('FLAT', 'REDUCING_BALANCE')) DEFAULT 'REDUCING_BALANCE',
  current_interest_rate REAL NOT NULL,
  disbursement_date DATE,
  maturity_date DATE,
  payment_day_of_month INTEGER CHECK(payment_day_of_month BETWEEN 1 AND 31),
  purpose TEXT,
  collateral_type TEXT,
  lender_name TEXT,
  lender_account_number TEXT,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE
);

-- Index for active loans lookup
CREATE INDEX idx_loans_active ON loans(is_active, start_date DESC) WHERE is_active = 1;

-- Index for loan maturity tracking
CREATE INDEX idx_loans_maturity ON loans(maturity_date, is_active) WHERE is_active = 1;

-- ============================================================================
-- Loan Interest Rates Table
-- ============================================================================
-- Historical tracking of interest rate changes for floating rate loans
CREATE TABLE loan_interest_rates (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  effective_date DATE NOT NULL,
  rate_percentage REAL NOT NULL CHECK(rate_percentage >= 0),
  rate_type TEXT CHECK(rate_type IN ('FIXED', 'FLOATING', 'TEASER')) DEFAULT 'FLOATING',
  base_rate TEXT,
  margin_percentage REAL DEFAULT 0,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(account_id) ON DELETE CASCADE
);

-- Index for loan rate history lookup
CREATE INDEX idx_loan_interest_rates_loan ON loan_interest_rates(loan_id, effective_date DESC);

-- Unique constraint: Only one rate change per effective date per loan
CREATE UNIQUE INDEX idx_loan_interest_rates_unique ON loan_interest_rates(loan_id, effective_date);

-- Index for current rate lookup (most recent effective date)
CREATE INDEX idx_loan_interest_rates_current ON loan_interest_rates(loan_id, effective_date DESC);

-- ============================================================================
-- Loan Installments Table
-- ============================================================================
-- Amortization schedule tracking with recalculation support
CREATE TABLE loan_installments (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  due_date DATE NOT NULL,
  installment_number INTEGER NOT NULL CHECK(installment_number > 0),
  principal_opening REAL NOT NULL,
  principal_component REAL NOT NULL,
  interest_component REAL NOT NULL,
  total_amount REAL NOT NULL,
  principal_closing REAL NOT NULL,
  status TEXT CHECK(status IN ('ESTIMATED', 'DUE', 'PAID', 'OVERDUE', 'WAIVED')) DEFAULT 'ESTIMATED',
  paid_date DATE,
  paid_amount REAL DEFAULT 0,
  prepayment_amount REAL DEFAULT 0,
  late_fee REAL DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(account_id) ON DELETE CASCADE
);

-- Index for loan installment schedule lookup
CREATE INDEX idx_loan_installments_loan ON loan_installments(loan_id, installment_number);

-- Index for upcoming installments (not yet paid)
CREATE INDEX idx_loan_installments_upcoming ON loan_installments(loan_id, due_date) WHERE status IN ('ESTIMATED', 'DUE');

-- Index for overdue installments (collections)
CREATE INDEX idx_loan_installments_overdue ON loan_installments(due_date, status, loan_id) WHERE status = 'OVERDUE';

-- Index for payment history (paid installments)
CREATE INDEX idx_loan_installments_paid ON loan_installments(loan_id, paid_date DESC) WHERE status = 'PAID';

-- Unique constraint: Only one installment per number per loan
CREATE UNIQUE INDEX idx_loan_installments_unique ON loan_installments(loan_id, installment_number);

-- Index for due date reminders
CREATE INDEX idx_loan_installments_due_date ON loan_installments(due_date, status) WHERE status IN ('DUE', 'OVERDUE');

-- ============================================================================
-- Loan Payments Table
-- ============================================================================
-- Tracks actual payments made against loans
CREATE TABLE loan_payments (
  id TEXT PRIMARY KEY,
  loan_id TEXT NOT NULL,
  installment_id TEXT,
  payment_date DATE NOT NULL,
  amount REAL NOT NULL,
  principal_portion REAL NOT NULL,
  interest_portion REAL NOT NULL,
  fee_portion REAL DEFAULT 0,
  payment_method TEXT,
  reference_number TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (loan_id) REFERENCES loans(account_id) ON DELETE CASCADE,
  FOREIGN KEY (installment_id) REFERENCES loan_installments(id) ON DELETE SET NULL
);

-- Index for loan payment history
CREATE INDEX idx_loan_payments_loan ON loan_payments(loan_id, payment_date DESC);

-- Index for payment tracking by reference number
CREATE INDEX idx_loan_payments_reference ON loan_payments(reference_number) WHERE reference_number IS NOT NULL;

-- Index for installment payment lookup
CREATE INDEX idx_loan_payments_installment ON loan_payments(installment_id);
