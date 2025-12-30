/**
 * Financial Accounts Types and Helpers
 *
 * Shared types and utilities for accounts that can be used in both server and client code.
 * Database operations are in accounts.server.ts
 */

// ============================================================================
// Type Definitions
// ============================================================================

export type AccountType = "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "LOAN" | "WALLET" | "INVESTMENT";

export interface FinancialAccount {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  current_balance: number;
  institution_name: string | null;
  account_number_last4: string | null;
  color_theme: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountData {
  name: string;
  type: AccountType;
  currency?: string;
  institution_name?: string;
  account_number_last4?: string;
  color_theme?: string;
}

export interface UpdateAccountData {
  name?: string;
  currency?: string;
  institution_name?: string;
  account_number_last4?: string;
  color_theme?: string;
  current_balance?: number;
}

export interface AccountWithTransactions extends FinancialAccount {
  recentTransactions: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    category: string | null;
  }>;
}

// ============================================================================
// Account Type Helpers
// ============================================================================

export const ACCOUNT_TYPES: Array<{ value: AccountType; label: string; color: string }> = [
  { value: "CHECKING", label: "Checking", color: "bg-blue-500" },
  { value: "SAVINGS", label: "Savings", color: "bg-green-500" },
  { value: "CREDIT_CARD", label: "Credit Card", color: "bg-purple-500" },
  { value: "LOAN", label: "Loan", color: "bg-red-500" },
  { value: "WALLET", label: "Wallet", color: "bg-yellow-500" },
  { value: "INVESTMENT", label: "Investment", color: "bg-indigo-500" },
];

export function getAccountTypeConfig(type: AccountType) {
  return ACCOUNT_TYPES.find((t) => t.value === type) || ACCOUNT_TYPES[0];
}
