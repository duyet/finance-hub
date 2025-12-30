/**
 * Transaction data access layer for dashboard queries
 * Provides optimized queries for dashboard metrics and reports
 */

import type { D1Database } from "@cloudflare/workers-types";
import { getDb } from "../auth/db.server";
import type {
  DashboardData,
  MonthlyDataPoint,
  CategoryBreakdown,
  RecentTransaction,
  TransactionStatus,
  TransactionType,
  TransactionRow,
  TransactionWithRelations,
  TransactionFilters,
  PaginationOptions,
  PaginatedTransactions,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilterOptions,
} from "./transactions.types";

// Re-export types for convenience
export type {
  DashboardData,
  MonthlyDataPoint,
  CategoryBreakdown,
  RecentTransaction,
  TransactionStatus,
  TransactionType,
  TransactionRow,
  TransactionWithRelations,
  TransactionFilters,
  PaginationOptions,
  PaginatedTransactions,
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilterOptions,
};

/**
 * Get complete dashboard data for a user
 * Aggregates all metrics in optimized queries
 */
export async function getDashboardData(
  request: Request,
  userId: string,
  months: number = 12
): Promise<DashboardData> {
  const db = getDb(request);

  // Get date range for monthly data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  // Run all queries in parallel for performance
  const [netWorth, incomeVsExpense, expenseByCategory, recentTransactions, liquidAccounts] =
    await Promise.all([
      getNetWorth(db, userId),
      getIncomeVsExpense(db, userId, months),
      getExpenseByCategory(db, userId, startDate, endDate),
      getRecentTransactions(db, userId, 10),
      getLiquidAccounts(db, userId),
    ]);

  // Calculate runway with last 3 months of expense data
  const runwayExpenseData = await getIncomeVsExpense(db, userId, 3);
  const runway = calculateRunway(liquidAccounts, runwayExpenseData);

  // Calculate summary metrics
  const summary = {
    totalIncome: incomeVsExpense.reduce((sum, m) => sum + m.income, 0),
    totalExpenses: incomeVsExpense.reduce((sum, m) => sum + m.expenses, 0),
    netFlow: incomeVsExpense.reduce((sum, m) => sum + m.net, 0),
    averageMonthlyBurn: calculateAverageMonthlyBurn(incomeVsExpense),
  };

  return {
    netWorth,
    runway,
    incomeVsExpense,
    expenseByCategory,
    recentTransactions,
    summary,
  };
}

/**
 * Calculate net worth from all financial accounts
 * Sum of all account balances (assets - liabilities)
 */
export async function getNetWorth(
  db: D1Database,
  userId: string
): Promise<number> {
  const result = await db
    .prepare(`
      SELECT COALESCE(SUM(
        CASE
          WHEN type IN ('CREDIT_CARD', 'LOAN') THEN -current_balance
          ELSE current_balance
        END
      ), 0) as net_worth
      FROM financial_accounts
      WHERE user_id = ? AND is_archived = 0
    `)
    .bind(userId)
    .first<{ net_worth: number }>();

  return result?.net_worth || 0;
}

/**
 * Calculate runway (how many months user can survive on current savings)
 * Runway = Total Liquid Assets / Average Monthly Burn
 */
function calculateRunway(
  liquidAccounts: number,
  incomeVsExpense: MonthlyDataPoint[]
): { months: number; health: "good" | "warning" | "critical" } {
  const averageMonthlyBurn = calculateAverageMonthlyBurn(incomeVsExpense);

  // Avoid division by zero
  if (averageMonthlyBurn <= 0) {
    return { months: Infinity, health: "good" };
  }

  const months = Math.floor(liquidAccounts / averageMonthlyBurn);

  // Determine health based on runway months
  let health: "good" | "warning" | "critical";
  if (months >= 6) {
    health = "good";
  } else if (months >= 3) {
    health = "warning";
  } else {
    health = "critical";
  }

  return { months, health };
}

/**
 * Get liquid assets (checking, savings, wallet)
 */
async function getLiquidAccounts(
  db: D1Database,
  userId: string
): Promise<number> {
  const result = await db
    .prepare(`
      SELECT COALESCE(SUM(current_balance), 0) as liquid
      FROM financial_accounts
      WHERE user_id = ?
        AND type IN ('CHECKING', 'SAVINGS', 'WALLET')
        AND is_archived = 0
    `)
    .bind(userId)
    .first<{ liquid: number }>();

  return result?.liquid || 0;
}

/**
 * Calculate average monthly burn rate
 * Burn = Average monthly expenses (excluding income)
 */
function calculateAverageMonthlyBurn(
  incomeVsExpense: MonthlyDataPoint[]
): number {
  if (incomeVsExpense.length === 0) return 0;

  const totalExpenses = incomeVsExpense.reduce((sum, m) => sum + m.expenses, 0);
  return totalExpenses / incomeVsExpense.length;
}

/**
 * Get income vs expenses for the last N months
 * Returns monthly aggregated data for chart visualization
 */
export async function getIncomeVsExpense(
  db: D1Database,
  userId: string,
  months: number = 12
): Promise<MonthlyDataPoint[]> {
  const result = await db
    .prepare(`
      WITH date_range AS (
        SELECT datetime('now', '-' || ? || ' months') as start_date
      ),
      monthly_data AS (
        SELECT
          strftime('%Y-%m', t.date) as month,
          SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE 0 END) as income,
          SUM(CASE WHEN c.type = 'EXPENSE' THEN ABS(t.amount) ELSE 0 END) as expenses
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ?
          AND t.date >= (SELECT start_date FROM date_range)
          AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
        GROUP BY strftime('%Y-%m', t.date)
      )
      SELECT
        month,
        COALESCE(income, 0) as income,
        COALESCE(expenses, 0) as expenses,
        COALESCE(income, 0) - COALESCE(expenses, 0) as net
      FROM monthly_data
      ORDER BY month ASC
    `)
    .bind(months, userId)
    .all<MonthlyDataPoint>();

  return result.results || [];
}

/**
 * Get expense breakdown by category for a date range
 * Returns percentage and amount for each category
 */
export async function getExpenseByCategory(
  db: D1Database,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CategoryBreakdown[]> {
  const result = await db
    .prepare(`
      WITH category_totals AS (
        SELECT
          c.id as category_id,
          c.name as category_name,
          c.color_theme as color,
          SUM(ABS(t.amount)) as amount
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ?
          AND t.date >= ?
          AND t.date <= ?
          AND c.type = 'EXPENSE'
          AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
        GROUP BY c.id, c.name, c.color_theme
        ORDER BY amount DESC
      ),
      total_expense AS (
        SELECT SUM(amount) as total FROM category_totals
      )
      SELECT
        ct.category_id as categoryId,
        ct.category_name as categoryName,
        ct.amount as amount,
        ct.color as color,
        ROUND((ct.amount * 100.0 / te.total), 2) as percentage
      FROM category_totals ct, total_expense te
      ORDER BY ct.amount DESC
    `)
    .bind(userId, startDate.toISOString(), endDate.toISOString())
    .all<CategoryBreakdown>();

  return result.results || [];
}

/**
 * Get recent transactions with account and category details
 * Returns the most recent transactions for the dashboard
 */
export async function getRecentTransactions(
  db: D1Database,
  userId: string,
  limit: number = 10
): Promise<RecentTransaction[]> {
  const result = await db
    .prepare(`
      SELECT
        t.id,
        t.date,
        t.description,
        t.merchant_name as merchantName,
        t.amount,
        t.status,
        c.name as categoryName,
        a.id as accountId,
        a.name as accountName
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN financial_accounts a ON t.account_id = a.id
      WHERE t.user_id = ?
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT ?
    `)
    .bind(userId, limit)
    .all<RecentTransaction>();

  return result.results || [];
}

/**
 * Get runway calculation with detailed breakdown
 */
export async function getRunway(
  request: Request,
  userId: string
): Promise<{ months: number; health: "good" | "warning" | "critical" }> {
  const db = getDb(request);

  const [liquidAssets, incomeVsExpense] = await Promise.all([
    getLiquidAccounts(db, userId),
    getIncomeVsExpense(db, userId, 3), // Use last 3 months for burn rate
  ]);

  return calculateRunway(liquidAssets, incomeVsExpense);
}

/**
 * Get transaction statistics for a specific period
 */
export async function getTransactionStats(
  db: D1Database,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}> {
  const result = await db
    .prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN c.type = 'EXPENSE' THEN ABS(t.amount) ELSE 0 END), 0) as expenses,
        COUNT(*) as transaction_count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
        AND t.date >= ?
        AND t.date <= ?
        AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
    `)
    .bind(userId, startDate.toISOString(), endDate.toISOString())
    .first<{
      income: number;
      expenses: number;
      transaction_count: number;
    }>();

  const income = result?.income || 0;
  const expenses = result?.expenses || 0;

  return {
    income,
    expenses,
    net: income - expenses,
    transactionCount: result?.transaction_count || 0,
  };
}

// ============================================================================
// Transaction CRUD Operations
// ============================================================================

/**
 * Transactions CRUD operations
 */
export const transactionsCrud = {
  /**
   * Get transactions with filters and pagination
   */
  async getTransactions(
    db: D1Database,
    userId: string,
    filters: TransactionFilters = {},
    pagination: PaginationOptions = { page: 1, pageSize: 50 }
  ): Promise<PaginatedTransactions> {
    const conditions: string[] = ["t.user_id = ?"];
    const params: (string | number)[] = [userId];

    // Build WHERE clause
    if (filters.startDate) {
      conditions.push("DATE(t.date) >= ?");
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      conditions.push("DATE(t.date) <= ?");
      params.push(filters.endDate);
    }
    if (filters.accountIds && filters.accountIds.length > 0) {
      conditions.push(`t.account_id IN (${filters.accountIds.map(() => "?").join(", ")})`);
      params.push(...filters.accountIds);
    }
    if (filters.categoryIds && filters.categoryIds.length > 0) {
      conditions.push(`t.category_id IN (${filters.categoryIds.map(() => "?").join(", ")})`);
      params.push(...filters.categoryIds);
    }
    if (filters.status) {
      conditions.push("t.status = ?");
      params.push(filters.status);
    }
    if (filters.type && filters.type !== "ALL") {
      conditions.push(filters.type === "INCOME" ? "t.amount >= 0" : "t.amount < 0");
    }
    if (filters.search) {
      conditions.push("(LOWER(t.description) LIKE ? OR LOWER(t.merchant_name) LIKE ?)");
      const searchPattern = `%${filters.search.toLowerCase()}%`;
      params.push(searchPattern, searchPattern);
    }

    const whereClause = conditions.join(" AND ");

    // Get total count
    const countResult = await db
      .prepare(
        `SELECT COUNT(*) as count FROM transactions t WHERE ${whereClause}`
      )
      .bind(...params)
      .first<{ count: number }>() as { count: number };

    const total = countResult.count;

    // Build ORDER BY clause
    const sortBy = pagination.sortBy || "date";
    const sortOrder = pagination.sortOrder || "desc";
    const validSortColumns = ["date", "amount", "description", "merchant_name", "status", "created_at"];
    const column = validSortColumns.includes(sortBy) ? sortBy : "date";

    // Calculate offset
    const offset = (pagination.page - 1) * pagination.pageSize;

    // Get transactions with related data
    const query = `
      SELECT
        t.*,
        fa.name as account_name,
        fa.type as account_type,
        fa.color_theme as account_color,
        c.name as category_name,
        c.type as category_type,
        c.color_theme as category_color,
        c.icon as category_icon
      FROM transactions t
      INNER JOIN financial_accounts fa ON t.account_id = fa.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE ${whereClause}
      ORDER BY t.${column} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `;

    const transactions = await db
      .prepare(query)
      .bind(...params, pagination.pageSize, offset)
      .all<TransactionWithRelations>();

    return {
      transactions: transactions.results,
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalPages: Math.ceil(total / pagination.pageSize),
    };
  },

  /**
   * Get transaction by ID
   */
  async getTransactionById(
    db: D1Database,
    id: string,
    userId: string
  ): Promise<TransactionWithRelations | null> {
    const query = `
      SELECT
        t.*,
        fa.name as account_name,
        fa.type as account_type,
        fa.color_theme as account_color,
        c.name as category_name,
        c.type as category_type,
        c.color_theme as category_color,
        c.icon as category_icon
      FROM transactions t
      INNER JOIN financial_accounts fa ON t.account_id = fa.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ? AND t.user_id = ?
    `;

    const result = await db
      .prepare(query)
      .bind(id, userId)
      .first<TransactionWithRelations>();

    return result || null;
  },

  /**
   * Create new transaction
   */
  async createTransaction(
    db: D1Database,
    userId: string,
    data: CreateTransactionInput
  ): Promise<TransactionWithRelations> {
    const id = crypto.randomUUID();

    await db
      .prepare(
        `INSERT INTO transactions (
          id, user_id, account_id, category_id, date, amount,
          description, merchant_name, status, reference_number,
          receipt_url, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        data.accountId,
        data.categoryId || null,
        data.date,
        data.amount,
        data.description,
        data.merchantName || null,
        data.status || "POSTED",
        data.referenceNumber || null,
        data.receiptUrl || null,
        data.notes || null
      )
      .run();

    const transaction = await transactionsCrud.getTransactionById(db, id, userId);
    if (!transaction) {
      throw new Error("Failed to create transaction");
    }
    return transaction;
  },

  /**
   * Update transaction
   */
  async updateTransaction(
    db: D1Database,
    id: string,
    userId: string,
    data: UpdateTransactionInput
  ): Promise<TransactionWithRelations | null> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.accountId !== undefined) {
      updates.push("account_id = ?");
      params.push(data.accountId);
    }
    if (data.categoryId !== undefined) {
      updates.push("category_id = ?");
      params.push(data.categoryId);
    }
    if (data.date !== undefined) {
      updates.push("date = ?");
      params.push(data.date);
    }
    if (data.amount !== undefined) {
      updates.push("amount = ?");
      params.push(data.amount);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      params.push(data.description);
    }
    if (data.merchantName !== undefined) {
      updates.push("merchant_name = ?");
      params.push(data.merchantName);
    }
    if (data.status !== undefined) {
      updates.push("status = ?");
      params.push(data.status);
    }
    if (data.referenceNumber !== undefined) {
      updates.push("reference_number = ?");
      params.push(data.referenceNumber);
    }
    if (data.receiptUrl !== undefined) {
      updates.push("receipt_url = ?");
      params.push(data.receiptUrl);
    }
    if (data.notes !== undefined) {
      updates.push("notes = ?");
      params.push(data.notes);
    }

    if (updates.length === 0) {
      return transactionsCrud.getTransactionById(db, id, userId);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id, userId);

    await db
      .prepare(`UPDATE transactions SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
      .bind(...params)
      .run();

    return transactionsCrud.getTransactionById(db, id, userId);
  },

  /**
   * Delete transaction
   */
  async deleteTransaction(db: D1Database, id: string, userId: string): Promise<boolean> {
    const result = await db
      .prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .run();

    return (result.meta?.changes || 0) > 0;
  },

  /**
   * Bulk update category for multiple transactions
   */
  async bulkUpdateCategory(
    db: D1Database,
    transactionIds: string[],
    categoryId: string | null,
    userId: string
  ): Promise<number> {
    if (transactionIds.length === 0) return 0;

    const placeholders = transactionIds.map(() => "?").join(", ");
    const params = [...transactionIds, userId];

    if (categoryId === null) {
      await db
        .prepare(`UPDATE transactions SET category_id = NULL WHERE id IN (${placeholders}) AND user_id = ?`)
        .bind(...params)
        .run();
    } else {
      params.unshift(categoryId);
      await db
        .prepare(`UPDATE transactions SET category_id = ? WHERE id IN (${placeholders}) AND user_id = ?`)
        .bind(...params)
        .run();
    }

    const result = await db
      .prepare(`SELECT COUNT(*) as count FROM transactions WHERE id IN (${placeholders}) AND user_id = ?`)
      .bind(...transactionIds, userId)
      .first<{ count: number }>() as { count: number };

    return result.count;
  },

  /**
   * Bulk delete transactions
   */
  async bulkDeleteTransactions(
    db: D1Database,
    transactionIds: string[],
    userId: string
  ): Promise<number> {
    if (transactionIds.length === 0) return 0;

    const placeholders = transactionIds.map(() => "?").join(", ");

    const result = await db
      .prepare(`DELETE FROM transactions WHERE id IN (${placeholders}) AND user_id = ?`)
      .bind(...transactionIds, userId)
      .run();

    return result.meta?.changes || 0;
  },

  /**
   * Get available filter options
   */
  async getTransactionFilters(
    db: D1Database,
    userId: string
  ): Promise<TransactionFilterOptions> {
    const [accountsResult, categoriesResult] = await Promise.all([
      db
        .prepare(
          `SELECT id, name, type FROM financial_accounts
           WHERE user_id = ? AND is_archived = 0
           ORDER BY name`
        )
        .bind(userId)
        .all<{ id: string; name: string; type: string }>(),
      db
        .prepare(
          `SELECT id, name, type, color_theme FROM categories
           WHERE user_id = ?
           ORDER BY type, name`
        )
        .bind(userId)
        .all<{ id: string; name: string; type: string; color_theme: string | null }>(),
    ]);

    return {
      accounts: accountsResult.results,
      categories: categoriesResult.results.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        color: c.color_theme,
      })),
    };
  },
};
