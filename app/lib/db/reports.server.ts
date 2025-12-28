/**
 * Reports data access layer
 * Provides data queries for PDF report generation
 */

import type { D1Database } from "@cloudflare/workers-types";
import { getDb } from "../auth/db.server";

/**
 * Report type enumeration
 */
export type ReportType = "monthly" | "annual" | "category" | "account";

/**
 * Report data types
 */

export interface MonthlyReportData {
  period: {
    year: number;
    month: number;
    startDate: Date;
    endDate: Date;
  };
  summary: {
    openingBalance: number;
    closingBalance: number;
    netWorthChange: number;
    totalIncome: number;
    totalExpenses: number;
    netFlow: number;
    transactionCount: number;
  };
  dailyBreakdown: DailyDataPoint[];
  categoryBreakdown: CategoryBreakdownItem[];
  topExpenses: TransactionItem[];
  topIncome: TransactionItem[];
}

export interface AnnualReportData {
  year: number;
  summary: {
    openingBalance: number;
    closingBalance: number;
    netWorthChange: number;
    totalIncome: number;
    totalExpenses: number;
    netFlow: number;
    transactionCount: number;
    averageMonthlyIncome: number;
    averageMonthlyExpenses: number;
  };
  monthlyTrends: MonthlyTrendData[];
  categoryBreakdown: CategoryBreakdownItem[];
  accountSummaries: AccountSummaryItem[];
}

export interface CategoryBreakdownData {
  period: {
    startDate: Date;
    endDate: Date;
  };
  categories: CategoryDetailItem[];
  totalAmount: number;
  transactionCount: number;
}

export interface AccountStatementData {
  account: {
    id: string;
    name: string;
    type: string;
    currency: string;
  };
  period: {
    startDate: Date;
    endDate: Date;
  };
  openingBalance: number;
  closingBalance: number;
  transactions: TransactionItem[];
  summary: {
    totalCredits: number;
    totalDebits: number;
    transactionCount: number;
  };
}

// Supporting types
export interface DailyDataPoint {
  date: string;
  income: number;
  expenses: number;
  net: number;
  balance: number;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  categoryType: string;
  amount: number;
  percentage: number;
  transactionCount: number;
  color?: string;
}

export interface TransactionItem {
  id: string;
  date: string;
  description: string;
  merchantName?: string;
  amount: number;
  categoryName?: string;
  accountName?: string;
  status: string;
}

export interface MonthlyTrendData {
  month: number;
  monthName: string;
  income: number;
  expenses: number;
  net: number;
  balance: number;
}

export interface AccountSummaryItem {
  accountId: string;
  accountName: string;
  accountType: string;
  openingBalance: number;
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  transactionCount: number;
}

export interface CategoryDetailItem extends CategoryBreakdownItem {
  topTransactions: TransactionItem[];
  averagePerTransaction: number;
}

/**
 * Get monthly report data
 */
export async function getMonthlyReportData(
  request: Request,
  userId: string,
  year: number,
  month: number
): Promise<MonthlyReportData> {
  const db = getDb(request);

  // Calculate date range for the month
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get opening balance (balance at start of month)
  const openingBalance = await getBalanceAtDate(db, userId, startDate);

  // Get summary data
  const summaryResult = await db
    .prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN c.type = 'EXPENSE' THEN ABS(t.amount) ELSE 0 END), 0) as total_expenses,
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
      total_income: number;
      total_expenses: number;
      transaction_count: number;
    }>();

  const totalIncome = summaryResult?.total_income || 0;
  const totalExpenses = summaryResult?.total_expenses || 0;
  const netFlow = totalIncome - totalExpenses;
  const closingBalance = openingBalance + netFlow;
  const netWorthChange = netFlow;

  const summary = {
    openingBalance,
    closingBalance,
    netWorthChange,
    totalIncome,
    totalExpenses,
    netFlow,
    transactionCount: summaryResult?.transaction_count || 0,
  };

  // Get daily breakdown
  const dailyBreakdown = await getDailyBreakdown(db, userId, startDate, endDate, openingBalance);

  // Get category breakdown
  const categoryBreakdown = await getCategoryBreakdown(db, userId, startDate, endDate);

  // Get top expenses
  const topExpenses = await getTopTransactions(db, userId, startDate, endDate, "EXPENSE", 10);

  // Get top income
  const topIncome = await getTopTransactions(db, userId, startDate, endDate, "INCOME", 10);

  return {
    period: {
      year,
      month,
      startDate,
      endDate,
    },
    summary,
    dailyBreakdown,
    categoryBreakdown,
    topExpenses,
    topIncome,
  };
}

/**
 * Get annual report data
 */
export async function getAnnualReportData(
  request: Request,
  userId: string,
  year: number
): Promise<AnnualReportData> {
  const db = getDb(request);

  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31, 23, 59, 59);

  // Get opening balance
  const openingBalance = await getBalanceAtDate(db, userId, startDate);

  // Get summary data
  const summaryResult = await db
    .prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN c.type = 'EXPENSE' THEN ABS(t.amount) ELSE 0 END), 0) as total_expenses,
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
      total_income: number;
      total_expenses: number;
      transaction_count: number;
    }>();

  const totalIncome = summaryResult?.total_income || 0;
  const totalExpenses = summaryResult?.total_expenses || 0;
  const netFlow = totalIncome - totalExpenses;
  const closingBalance = openingBalance + netFlow;

  const summary = {
    openingBalance,
    closingBalance,
    netWorthChange: netFlow,
    totalIncome,
    totalExpenses,
    netFlow,
    transactionCount: summaryResult?.transaction_count || 0,
    averageMonthlyIncome: totalIncome / 12,
    averageMonthlyExpenses: totalExpenses / 12,
  };

  // Get monthly trends
  const monthlyTrends = await getMonthlyTrends(db, userId, year, openingBalance);

  // Get category breakdown for the year
  const categoryBreakdown = await getCategoryBreakdown(db, userId, startDate, endDate);

  // Get account summaries
  const accountSummaries = await getAccountSummaries(db, userId, startDate, endDate);

  return {
    year,
    summary,
    monthlyTrends,
    categoryBreakdown,
    accountSummaries,
  };
}

/**
 * Get category breakdown data
 */
export async function getCategoryBreakdownData(
  request: Request,
  userId: string,
  startDate: Date,
  endDate: Date,
  categoryType?: "INCOME" | "EXPENSE"
): Promise<CategoryBreakdownData> {
  const db = getDb(request);

  const categoryTypeFilter = categoryType ? `AND c.type = '${categoryType}'` : "";

  const result = await db
    .prepare(`
      WITH category_totals AS (
        SELECT
          c.id as category_id,
          c.name as category_name,
          c.type as category_type,
          c.color_theme as color,
          SUM(ABS(t.amount)) as amount,
          COUNT(*) as transaction_count
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ?
          AND t.date >= ?
          AND t.date <= ?
          AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
          ${categoryTypeFilter}
        GROUP BY c.id, c.name, c.type, c.color_theme
        ORDER BY amount DESC
      ),
      total_amount AS (
        SELECT SUM(amount) as total FROM category_totals
      )
      SELECT
        ct.category_id as categoryId,
        ct.category_name as categoryName,
        ct.category_type as categoryType,
        ct.amount as amount,
        ct.transaction_count as transactionCount,
        ct.color as color,
        ROUND((ct.amount * 100.0 / ta.total), 2) as percentage
      FROM category_totals ct, total_amount ta
      ORDER BY ct.amount DESC
    `)
    .bind(userId, startDate.toISOString(), endDate.toISOString())
    .all<CategoryBreakdownItem>();

  const categories = result.results || [];
  const totalAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);
  const transactionCount = categories.reduce((sum, cat) => sum + cat.transactionCount, 0);

  // Get detailed data for each category
  const categoryDetails: CategoryDetailItem[] = await Promise.all(
    categories.map(async (cat) => {
      const topTransactions = await getTopTransactionsByCategory(
        db,
        userId,
        cat.categoryId,
        startDate,
        endDate,
        5
      );

      return {
        ...cat,
        topTransactions,
        averagePerTransaction: cat.transactionCount > 0 ? cat.amount / cat.transactionCount : 0,
      };
    })
  );

  return {
    period: {
      startDate,
      endDate,
    },
    categories: categoryDetails,
    totalAmount,
    transactionCount,
  };
}

/**
 * Get account statement data
 */
export async function getAccountStatementData(
  request: Request,
  userId: string,
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<AccountStatementData> {
  const db = getDb(request);

  // Get account details
  const accountResult = await db
    .prepare(`
      SELECT id, name, type, currency
      FROM financial_accounts
      WHERE id = ? AND user_id = ?
    `)
    .bind(accountId, userId)
    .first<{ id: string; name: string; type: string; currency: string }>();

  if (!accountResult) {
    throw new Error("Account not found");
  }

  // Get opening balance
  const openingBalanceResult = await db
    .prepare(`
      SELECT COALESCE(SUM(amount), 0) as balance
      FROM transactions
      WHERE account_id = ? AND user_id = ? AND date < ?
        AND status IN ('POSTED', 'CLEARED', 'RECONCILED')
    `)
    .bind(accountId, userId, startDate.toISOString())
    .first<{ balance: number }>();

  const openingBalance = openingBalanceResult?.balance || 0;

  // Get transactions
  const transactionsResult = await db
    .prepare(`
      SELECT
        t.id,
        t.date,
        t.description,
        t.merchant_name as merchantName,
        t.amount,
        t.status,
        c.name as categoryName,
        fa.name as accountName
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN financial_accounts fa ON t.account_id = fa.id
      WHERE t.account_id = ?
        AND t.user_id = ?
        AND t.date >= ?
        AND t.date <= ?
      ORDER BY t.date ASC, t.created_at ASC
    `)
    .bind(accountId, userId, startDate.toISOString(), endDate.toISOString())
    .all<TransactionItem>();

  const transactions = transactionsResult.results || [];

  // Calculate closing balance
  const closingBalance = openingBalance + transactions.reduce((sum, t) => sum + t.amount, 0);

  // Get summary
  const summaryResult = await db
    .prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN amount >= 0 THEN amount ELSE 0 END), 0) as total_credits,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_debits,
        COUNT(*) as transaction_count
      FROM transactions
      WHERE account_id = ? AND user_id = ? AND date >= ? AND date <= ?
        AND status IN ('POSTED', 'CLEARED', 'RECONCILED')
    `)
    .bind(accountId, userId, startDate.toISOString(), endDate.toISOString())
    .first<{
      total_credits: number;
      total_debits: number;
      transaction_count: number;
    }>();

  return {
    account: accountResult,
    period: {
      startDate,
      endDate,
    },
    openingBalance,
    closingBalance,
    transactions,
    summary: {
      totalCredits: summaryResult?.total_credits || 0,
      totalDebits: summaryResult?.total_debits || 0,
      transactionCount: summaryResult?.transaction_count || 0,
    },
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get balance at a specific date (sum of all transaction amounts before date)
 */
async function getBalanceAtDate(
  db: D1Database,
  userId: string,
  date: Date
): Promise<number> {
  const result = await db
    .prepare(`
      SELECT COALESCE(SUM(t.amount), 0) as balance
      FROM transactions t
      WHERE t.user_id = ? AND t.date < ?
        AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
    `)
    .bind(userId, date.toISOString())
    .first<{ balance: number }>();

  return result?.balance || 0;
}

/**
 * Get daily breakdown for a period
 */
async function getDailyBreakdown(
  db: D1Database,
  userId: string,
  startDate: Date,
  endDate: Date,
  openingBalance: number
): Promise<DailyDataPoint[]> {
  const result = await db
    .prepare(`
      SELECT
        DATE(t.date) as date,
        COALESCE(SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN c.type = 'EXPENSE' THEN ABS(t.amount) ELSE 0 END), 0) as expenses
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
        AND t.date >= ?
        AND t.date <= ?
        AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
      GROUP BY DATE(t.date)
      ORDER BY date ASC
    `)
    .bind(userId, startDate.toISOString(), endDate.toISOString())
    .all<{
      date: string;
      income: number;
      expenses: number;
    }>();

  const rows = result.results || [];
  let runningBalance = openingBalance;

  return rows.map((row) => {
    const net = row.income - row.expenses;
    runningBalance += net;
    return {
      date: row.date,
      income: row.income,
      expenses: row.expenses,
      net,
      balance: runningBalance,
    };
  });
}

/**
 * Get category breakdown for a period
 */
async function getCategoryBreakdown(
  db: D1Database,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CategoryBreakdownItem[]> {
  const result = await db
    .prepare(`
      WITH category_totals AS (
        SELECT
          c.id as category_id,
          c.name as category_name,
          c.type as category_type,
          c.color_theme as color,
          SUM(ABS(t.amount)) as amount,
          COUNT(*) as transaction_count
        FROM transactions t
        JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ?
          AND t.date >= ?
          AND t.date <= ?
          AND c.type = 'EXPENSE'
          AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
        GROUP BY c.id, c.name, c.type, c.color_theme
        ORDER BY amount DESC
      ),
      total_expense AS (
        SELECT SUM(amount) as total FROM category_totals
      )
      SELECT
        ct.category_id as categoryId,
        ct.category_name as categoryName,
        ct.category_type as categoryType,
        ct.amount as amount,
        ct.transaction_count as transactionCount,
        ct.color as color,
        ROUND((ct.amount * 100.0 / te.total), 2) as percentage
      FROM category_totals ct, total_expense te
      ORDER BY ct.amount DESC
    `)
    .bind(userId, startDate.toISOString(), endDate.toISOString())
    .all<CategoryBreakdownItem>();

  return result.results || [];
}

/**
 * Get top transactions by type
 */
async function getTopTransactions(
  db: D1Database,
  userId: string,
  startDate: Date,
  endDate: Date,
  type: string,
  limit: number
): Promise<TransactionItem[]> {
  const typeFilter = type === "EXPENSE" ? "t.amount < 0" : "t.amount >= 0";

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
        fa.name as accountName
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN financial_accounts fa ON t.account_id = fa.id
      WHERE t.user_id = ?
        AND t.date >= ?
        AND t.date <= ?
        AND ${typeFilter}
        AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
      ORDER BY ABS(t.amount) DESC
      LIMIT ?
    `)
    .bind(userId, startDate.toISOString(), endDate.toISOString(), limit)
    .all<TransactionItem>();

  return result.results || [];
}

/**
 * Get top transactions by category
 */
async function getTopTransactionsByCategory(
  db: D1Database,
  userId: string,
  categoryId: string,
  startDate: Date,
  endDate: Date,
  limit: number
): Promise<TransactionItem[]> {
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
        fa.name as accountName
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN financial_accounts fa ON t.account_id = fa.id
      WHERE t.user_id = ?
        AND t.category_id = ?
        AND t.date >= ?
        AND t.date <= ?
        AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
      ORDER BY ABS(t.amount) DESC
      LIMIT ?
    `)
    .bind(userId, categoryId, startDate.toISOString(), endDate.toISOString(), limit)
    .all<TransactionItem>();

  return result.results || [];
}

/**
 * Get monthly trends for a year
 */
async function getMonthlyTrends(
  db: D1Database,
  userId: string,
  year: number,
  openingBalance: number
): Promise<MonthlyTrendData[]> {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const result = await db
    .prepare(`
      WITH monthly_data AS (
        SELECT
          CAST(strftime('%m', t.date) AS INTEGER) as month,
          COALESCE(SUM(CASE WHEN c.type = 'INCOME' THEN t.amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN c.type = 'EXPENSE' THEN ABS(t.amount) ELSE 0 END), 0) as expenses
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ?
          AND strftime('%Y', t.date) = ?
          AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
        GROUP BY CAST(strftime('%m', t.date) AS INTEGER)
      )
      SELECT
        m.month,
        COALESCE(md.income, 0) as income,
        COALESCE(md.expenses, 0) as expenses
      FROM (
        SELECT 1 as month UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
        UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
        UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12
      ) m
      LEFT JOIN monthly_data md ON m.month = md.month
      ORDER BY m.month
    `)
    .bind(userId, year.toString())
    .all<{
      month: number;
      income: number;
      expenses: number;
    }>();

  const rows = result.results || [];
  let runningBalance = openingBalance;

  return rows.map((row) => {
    const net = row.income - row.expenses;
    runningBalance += net;
    return {
      month: row.month,
      monthName: monthNames[row.month - 1],
      income: row.income,
      expenses: row.expenses,
      net,
      balance: runningBalance,
    };
  });
}

/**
 * Get account summaries for a period
 */
async function getAccountSummaries(
  db: D1Database,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<AccountSummaryItem[]> {
  const result = await db
    .prepare(`
      SELECT
        fa.id as accountId,
        fa.name as accountName,
        fa.type as accountType,
        COALESCE(opening.balance, 0) as openingBalance,
        COALESCE(SUM(t.amount), 0) as netChange,
        COUNT(t.id) as transactionCount
      FROM financial_accounts fa
      LEFT JOIN (
        SELECT account_id, SUM(amount) as balance
        FROM transactions
        WHERE user_id = ? AND date < ?
          AND status IN ('POSTED', 'CLEARED', 'RECONCILED')
        GROUP BY account_id
      ) opening ON fa.id = opening.account_id
      LEFT JOIN transactions t ON fa.id = t.account_id
        AND t.user_id = ?
        AND t.date >= ?
        AND t.date <= ?
        AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
      WHERE fa.user_id = ?
      GROUP BY fa.id, fa.name, fa.type, opening.balance
      ORDER BY fa.name
    `)
    .bind(
      userId,
      startDate.toISOString(),
      userId,
      startDate.toISOString(),
      endDate.toISOString(),
      userId
    )
    .all<{
      accountId: string;
      accountName: string;
      accountType: string;
      openingBalance: number;
      netChange: number;
      transactionCount: number;
    }>();

  return (result.results || []).map((row) => {
    const closingBalance = row.openingBalance + row.netChange;
    return {
      accountId: row.accountId,
      accountName: row.accountName,
      accountType: row.accountType,
      openingBalance: row.openingBalance,
      closingBalance,
      totalCredits: row.netChange > 0 ? row.netChange : 0,
      totalDebits: row.netChange < 0 ? Math.abs(row.netChange) : 0,
      transactionCount: row.transactionCount,
    };
  });
}

// ============================================================================
// Report History Management
// ============================================================================

/**
 * Report history record types
 */
export interface ReportHistoryRecord {
  id: string;
  userId: string;
  reportType: ReportType;
  title: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  fileUrl?: string;
  metadata?: string;
}

export interface ReportHistoryMetadata {
  filters?: {
    categoryIds?: string[];
    accountIds?: string[];
    includePending?: boolean;
  };
  options?: {
    includeCharts?: boolean;
    format?: "pdf" | "csv";
  };
}

/**
 * Create a report history record
 */
export async function createReportRecord(
  request: Request,
  userId: string,
  reportType: ReportType,
  title: string,
  startDate: Date,
  endDate: Date,
  fileUrl?: string,
  metadata?: ReportHistoryMetadata
): Promise<ReportHistoryRecord> {
  const db = getDb(request);
  const id = crypto.randomUUID();

  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  await db
    .prepare(`
      INSERT INTO report_history (id, user_id, report_type, title, start_date, end_date, file_url, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      userId,
      reportType,
      title,
      startDate.toISOString(),
      endDate.toISOString(),
      fileUrl || null,
      metadataJson
    )
    .run();

  return {
    id,
    userId,
    reportType,
    title,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    generatedAt: new Date().toISOString(),
    fileUrl: fileUrl || undefined,
    metadata: metadataJson || undefined,
  };
}

/**
 * Get report history for a user
 */
export async function getReportHistory(
  request: Request,
  userId: string,
  options?: {
    reportType?: ReportType;
    limit?: number;
    offset?: number;
  }
): Promise<ReportHistoryRecord[]> {
  const db = getDb(request);
  const { reportType, limit = 50, offset = 0 } = options || {};

  let query = `
    SELECT
      id,
      user_id as userId,
      report_type as reportType,
      title,
      start_date as startDate,
      end_date as endDate,
      generated_at as generatedAt,
      file_url as fileUrl,
      metadata
    FROM report_history
    WHERE user_id = ?
  `;

  const params: Array<string | number> = [userId];

  if (reportType) {
    query += ` AND report_type = ?`;
    params.push(reportType);
  }

  query += ` ORDER BY generated_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const result = await db.prepare(query).bind(...params).all<ReportHistoryRecord>();
  return result.results || [];
}

/**
 * Get a single report history record by ID
 */
export async function getReportRecord(
  request: Request,
  userId: string,
  reportId: string
): Promise<ReportHistoryRecord | null> {
  const db = getDb(request);

  const result = await db
    .prepare(`
      SELECT
        id,
        user_id as userId,
        report_type as reportType,
        title,
        start_date as startDate,
        end_date as endDate,
        generated_at as generatedAt,
        file_url as fileUrl,
        metadata
      FROM report_history
      WHERE id = ? AND user_id = ?
    `)
    .bind(reportId, userId)
    .first<ReportHistoryRecord>();

  return result || null;
}

/**
 * Delete a report history record
 */
export async function deleteReportRecord(
  request: Request,
  userId: string,
  reportId: string
): Promise<boolean> {
  const db = getDb(request);

  const result = await db
    .prepare(`DELETE FROM report_history WHERE id = ? AND user_id = ?`)
    .bind(reportId, userId)
    .run();

  return result.meta.changes > 0;
}

/**
 * Update report file URL (after uploading to R2)
 */
export async function updateReportFileUrl(
  request: Request,
  userId: string,
  reportId: string,
  fileUrl: string
): Promise<boolean> {
  const db = getDb(request);

  const result = await db
    .prepare(`UPDATE report_history SET file_url = ? WHERE id = ? AND user_id = ?`)
    .bind(fileUrl, reportId, userId)
    .run();

  return result.meta.changes > 0;
}
