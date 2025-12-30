/**
 * CSV Import Types
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
 * Import result statistics
 */
export interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  duplicates: number;
  errors: Array<{
    row: number;
    field: string;
    value: string;
    message: string;
  }>;
  warnings: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}
