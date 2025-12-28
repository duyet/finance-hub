/**
 * CSV Import Types and Interfaces
 */

/**
 * Raw CSV row as key-value pairs
 */
export interface CsvRow {
  [key: string]: string;
}

/**
 * Column mapping from CSV headers to standard fields
 */
export interface ColumnMapping {
  date?: string;
  amount?: string;
  description?: string;
  merchant?: string;
  category?: string;
  account?: string;
}

/**
 * Import options for processing CSV data
 */
export interface ImportOptions {
  targetAccountId?: string;
  defaultCategoryId?: string;
  dateFormat?: string;
  skipHeaderRow?: boolean;
  dryRun?: boolean;
}

/**
 * Parsed CSV data with metadata
 */
export interface ParsedCsvData {
  headers: string[];
  rows: CsvRow[];
  totalRows: number;
  previewRows: CsvRow[];
}

/**
 * Import result statistics
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  duplicates: number;
  errors: ImportError[];
  warnings: ImportWarning[];
}

/**
 * Import error details
 */
export interface ImportError {
  row: number;
  field: string;
  value: string;
  message: string;
}

/**
 * Import warning (non-critical issues)
 */
export interface ImportWarning {
  row: number;
  field: string;
  message: string;
}

/**
 * Validation result for a CSV row
 */
export interface RowValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Transaction input from CSV row
 */
export interface TransactionFromCsv {
  accountId: string;
  categoryId?: string | null;
  date: string;
  amount: number;
  description: string;
  merchantName?: string | null;
  status?: string;
}

/**
 * Date format detection result
 */
export interface DateFormatDetection {
  format: string;
  confidence: number;
  samples: string[];
}

/**
 * Standard date formats supported
 */
export const DATE_FORMATS = {
  ISO: "YYYY-MM-DD",
  US: "MM/DD/YYYY",
  EU: "DD/MM/YYYY",
  UK: "DD-MM-YYYY",
  VN: "DD/MM/YYYY", // Vietnamese format
  DOT: "DD.MM.YYYY",
  TEXT: "MMM DD, YYYY",
} as const;

export type DateFormat = (typeof DATE_FORMATS)[keyof typeof DATE_FORMATS];

/**
 * Required fields for CSV import
 */
export const REQUIRED_FIELDS = ["date", "amount", "description"] as const;

/**
 * Optional fields for CSV import
 */
export const OPTIONAL_FIELDS = ["merchant", "category", "account"] as const;

/**
 * All standard fields
 */
export const STANDARD_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS] as const;
