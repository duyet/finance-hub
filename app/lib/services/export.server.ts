/**
 * Transaction Export Service
 *
 * Provides functionality to export transactions to various formats
 * including CSV and Excel. Supports filtering, date ranges, and custom fields.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { getDb } from "../auth/db.server";

/**
 * Export format options
 */
export type ExportFormat = "csv" | "excel" | "json";

/**
 * Export options
 */
export interface ExportOptions {
  userId: string;
  format: ExportFormat;
  startDate?: Date;
  endDate?: Date;
  accountIds?: string[];
  categoryIds?: string[];
  includeHeader?: boolean;
  fields?: ExportField[];
}

/**
 * Fields available for export
 */
export type ExportField =
  | "date"
  | "description"
  | "amount"
  | "currency"
  | "category"
  | "account"
  | "status"
  | "notes"
  | "tags"
  | "reference"
  | "receiptUrl";

/**
 * Transaction export data
 */
export interface TransactionExportRow {
  date: string;
  description: string;
  amount: number;
  currency: string;
  category: string | null;
  account: string | null;
  status: string;
  notes: string | null;
  tags: string | null;
  reference: string | null;
  receiptUrl: string | null;
}

/**
 * Default fields for export
 */
const DEFAULT_EXPORT_FIELDS: ExportField[] = [
  "date",
  "description",
  "amount",
  "currency",
  "category",
  "account",
  "status",
  "notes",
];

/**
 * Map database row to export format
 */
function mapTransactionRow(row: any): TransactionExportRow {
  return {
    date: row.date,
    description: row.description,
    amount: row.amount,
    currency: row.currency || "USD",
    category: row.category_name || row.category_id || null,
    account: row.account_name || row.account_id || null,
    status: row.status,
    notes: row.notes || null,
    tags: row.tags || null,
    reference: row.reference_number || null,
    receiptUrl: row.receipt_url || null,
  };
}

/**
 * Get transactions for export with optional filters
 */
async function getTransactionsForExport(
  db: D1Database,
  options: ExportOptions
): Promise<TransactionExportRow[]> {
  const { userId, startDate, endDate, accountIds, categoryIds } = options;

  // Build query conditions
  const conditions: string[] = ["t.user_id = ?"];
  const params: (string | number)[] = [userId];

  if (startDate) {
    conditions.push("DATE(t.date) >= ?");
    params.push(startDate.toISOString().split("T")[0]);
  }

  if (endDate) {
    conditions.push("DATE(t.date) <= ?");
    params.push(endDate.toISOString().split("T")[0]);
  }

  if (accountIds && accountIds.length > 0) {
    const placeholders = accountIds.map(() => "?").join(",");
    conditions.push(`t.account_id IN (${placeholders})`);
    params.push(...accountIds);
  }

  if (categoryIds && categoryIds.length > 0) {
    const placeholders = categoryIds.map(() => "?").join(",");
    conditions.push(`t.category_id IN (${placeholders})`);
    params.push(...categoryIds);
  }

  const whereClause = conditions.join(" AND ");

  const result = await db
    .prepare(
      `SELECT
        t.date,
        t.description,
        t.amount,
        t.currency,
        t.status,
        t.notes,
        t.tags,
        t.reference_number,
        t.receipt_url,
        t.category_id,
        t.account_id,
        c.name as category_name,
        a.name as account_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN financial_accounts a ON t.account_id = a.id
      WHERE ${whereClause}
      ORDER BY t.date DESC, t.created_at DESC`
    )
    .bind(...params)
    .all();

  return (result.results || []).map(mapTransactionRow);
}

/**
 * Format field value for export
 */
function formatFieldValue(row: TransactionExportRow, field: ExportField): string {
  switch (field) {
    case "date":
      return row.date;
    case "description":
      return row.description || "";
    case "amount":
      return row.amount.toString();
    case "currency":
      return row.currency;
    case "category":
      return row.category || "";
    case "account":
      return row.account || "";
    case "status":
      return row.status;
    case "notes":
      return row.notes || "";
    case "tags":
      return row.tags || "";
    case "reference":
      return row.reference || "";
    case "receiptUrl":
      return row.receiptUrl || "";
    default:
      return "";
  }
}

/**
 * Get header name for field
 */
function getFieldHeader(field: ExportField): string {
  const headers: Record<ExportField, string> = {
    date: "Date",
    description: "Description",
    amount: "Amount",
    currency: "Currency",
    category: "Category",
    account: "Account",
    status: "Status",
    notes: "Notes",
    tags: "Tags",
    reference: "Reference",
    receiptUrl: "Receipt URL",
  };
  return headers[field];
}

/**
 * Generate CSV export
 */
export async function generateCSVExport(
  request: Request,
  options: ExportOptions
): Promise<string> {
  const db = getDb(request);
  const transactions = await getTransactionsForExport(db, options);
  const fields = options.fields || DEFAULT_EXPORT_FIELDS;
  const includeHeader = options.includeHeader !== false;

  const rows: string[] = [];

  // Add header row
  if (includeHeader) {
    rows.push(fields.map(getFieldHeader).join(","));
  }

  // Add data rows
  for (const tx of transactions) {
    const values = fields.map((field) => {
      const value = formatFieldValue(tx, field);
      // Escape quotes and wrap in quotes if contains special characters
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    rows.push(values.join(","));
  }

  return rows.join("\n");
}

/**
 * Generate JSON export
 */
export async function generateJSONExport(
  request: Request,
  options: ExportOptions
): Promise<string> {
  const db = getDb(request);
  const transactions = await getTransactionsForExport(db, options);
  const fields = options.fields || DEFAULT_EXPORT_FIELDS;

  const data = transactions.map((tx) => {
    const row: Record<string, string | number> = {};
    for (const field of fields) {
      row[field] = formatFieldValue(tx, field);
    }
    return row;
  });

  return JSON.stringify(data, null, 2);
}

/**
 * Generate Excel export (basic CSV format with Excel-specific headers)
 *
 * Note: For true Excel .xlsx generation, additional libraries like xlsx
 * would be needed. For now, we generate a CSV with Excel-friendly BOM.
 */
export async function generateExcelExport(
  request: Request,
  options: ExportOptions
): Promise<string> {
  const csv = await generateCSVExport(request, options);
  // Add UTF-8 BOM for Excel compatibility
  return "\uFEFF" + csv;
}

/**
 * Generate filename for export
 */
export function generateExportFilename(
  format: ExportFormat,
  startDate?: Date,
  endDate?: Date
): string {
  const dateStr = startDate || endDate
    ? `${startDate?.toISOString().split("T")[0] || "all"}-${endDate?.toISOString().split("T")[0] || "all"}`
    : "all";

  const timestamp = new Date().toISOString().split("T")[0];
  const extension = format === "excel" ? "csv" : format;

  return `transactions_${dateStr}_${timestamp}.${extension}`;
}

/**
 * Get content type for export format
 */
export function getExportContentType(format: ExportFormat): string {
  const types: Record<ExportFormat, string> = {
    csv: "text/csv; charset=utf-8",
    excel: "text/csv; charset=utf-8", // CSV with BOM for Excel
    json: "application/json",
  };
  return types[format];
}

/**
 * Main export function - routes to appropriate format
 */
export async function exportTransactions(
  request: Request,
  options: ExportOptions
): Promise<{ data: string; filename: string; contentType: string }> {
  const data = await (async () => {
    switch (options.format) {
      case "csv":
        return await generateCSVExport(request, options);
      case "excel":
        return await generateExcelExport(request, options);
      case "json":
        return await generateJSONExport(request, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  })();

  return {
    data,
    filename: generateExportFilename(options.format, options.startDate, options.endDate),
    contentType: getExportContentType(options.format),
  };
}

/**
 * Get export metadata for UI
 */
export async function getExportMetadata(request: Request, userId: string) {
  const db = getDb(request);

  // Get transaction count by account
  const accountsResult = await db
    .prepare(
      `SELECT
        a.id,
        a.name,
        a.type,
        COUNT(t.id) as transaction_count,
        MIN(t.date) as first_transaction,
        MAX(t.date) as last_transaction
      FROM financial_accounts a
      LEFT JOIN transactions t ON a.id = t.account_id AND t.user_id = ?
      WHERE a.user_id = ? AND a.is_archived = 0
      GROUP BY a.id
      ORDER BY a.name`
    )
    .bind(userId, userId)
    .all();

  // Get transaction count by category
  const categoriesResult = await db
    .prepare(
      `SELECT
        c.id,
        c.name,
        COUNT(t.id) as transaction_count,
        SUM(CASE WHEN t.amount >= 0 THEN t.amount ELSE 0 END) as total_income,
        SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END) as total_expense
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id AND t.user_id = ?
      WHERE c.user_id = ?
      GROUP BY c.id
      ORDER BY c.name`
    )
    .bind(userId, userId)
    .all();

  // Get date range
  const dateRangeResult = await db
    .prepare(
      `SELECT
        MIN(date) as earliest_date,
        MAX(date) as latest_date,
        COUNT(*) as total_transactions
      FROM transactions
      WHERE user_id = ?`
    )
    .bind(userId)
    .first<{ earliest_date: string; latest_date: string; total_transactions: number }>();

  return {
    accounts: accountsResult.results || [],
    categories: categoriesResult.results || [],
    dateRange: dateRangeResult || null,
  };
}
