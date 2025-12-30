/**
 * Transactions Types
 *
 * Shared types for transactions that can be used in both server and client code.
 * Database operations are in transactions.server.ts
 */

/**
 * Dashboard data types
 */
export interface DashboardData {
  netWorth: number;
  runway: {
    months: number;
    health: "good" | "warning" | "critical";
  };
  incomeVsExpense: MonthlyDataPoint[];
  expenseByCategory: CategoryBreakdown[];
  recentTransactions: RecentTransaction[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netFlow: number;
    averageMonthlyBurn: number;
  };
}

export interface MonthlyDataPoint {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  color?: string;
}

export interface RecentTransaction {
  id: string;
  date: string;
  description: string;
  merchantName?: string;
  amount: number;
  categoryName?: string;
  accountId: string;
  accountName: string;
  status: string;
}

/**
 * Transaction status types
 */
export type TransactionStatus = "PENDING" | "POSTED" | "CLEARED" | "RECONCILED";

/**
 * Transaction type for filtering
 */
export type TransactionType = "INCOME" | "EXPENSE" | "ALL";

/**
 * Transaction row from database
 */
export interface TransactionRow {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  date: string;
  amount: number;
  description: string;
  merchant_name: string | null;
  status: TransactionStatus;
  reference_number: string | null;
  receipt_url: string | null;
  notes: string | null;
  is_split: number;
  is_recurring: number;
  recurring_transaction_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Transaction with related data
 */
export interface TransactionWithRelations extends TransactionRow {
  account_name: string;
  account_type: string;
  account_color: string | null;
  category_name: string | null;
  category_type: string | null;
  category_color: string | null;
  category_icon: string | null;
}

/**
 * Filters for transaction queries
 */
export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  accountIds?: string[];
  categoryIds?: string[];
  type?: TransactionType;
  status?: TransactionStatus;
  search?: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Paginated result
 */
export interface PaginatedTransactions {
  transactions: TransactionWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Create transaction input
 */
export interface CreateTransactionInput {
  accountId: string;
  categoryId?: string | null;
  date: string; // ISO date string
  amount: number;
  description: string;
  merchantName?: string | null;
  status?: TransactionStatus;
  referenceNumber?: string | null;
  receiptUrl?: string | null;
  notes?: string | null;
}

/**
 * Update transaction input
 */
export interface UpdateTransactionInput extends Partial<CreateTransactionInput> {
  accountId?: string;
  categoryId?: string | null;
  date?: string;
  amount?: number;
  description?: string;
}

/**
 * Filter options for UI
 */
export interface TransactionFilterOptions {
  accounts: Array<{ id: string; name: string; type: string }>;
  categories: Array<{ id: string; name: string; type: string; color?: string | null }>;
}
