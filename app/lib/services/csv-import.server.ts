/**
 * CSV Import Service
 * Handles parsing, validation, and importing of CSV transaction data
 */

import Papa from "papaparse";
import type { D1Database } from "@cloudflare/workers-types";
import type {
  CsvRow,
  ColumnMapping,
  ImportOptions,
  ParsedCsvData,
  ImportResult,
  ImportError,
  ImportWarning,
  RowValidationResult,
  TransactionFromCsv,
  DateFormatDetection,
} from "../types/csv-import";
import { REQUIRED_FIELDS, DATE_FORMATS } from "../types/csv-import";
import { transactionsCrud } from "../db/transactions.server";
import { getAIService } from "./ai.server";
import type { CreateTransactionInput } from "../validations/transaction";

/**
 * CSV Import Service
 */
export class CsvImportService {
  /**
   * Parse CSV file to extract headers and rows
   */
  static async parseCSV(file: File): Promise<ParsedCsvData> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          const rows = results.data as CsvRow[];

          resolve({
            headers,
            rows,
            totalRows: rows.length,
            previewRows: rows.slice(0, 10),
          });
        },
        error: (error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        },
      });
    });
  }

  /**
   * Detect column mapping using AI
   */
  static async detectColumnMapping(
    request: Request,
    headers: string[]
  ): Promise<ColumnMapping> {
    try {
      const aiService = getAIService(request);
      const mapping = await aiService.mapColumns(headers);

      // Fallback to keyword mapping if AI returns empty result
      if (Object.keys(mapping).length === 0) {
        return AIService.fallbackMapping(headers);
      }

      return mapping;
    } catch (error) {
      console.error("AI mapping failed, using fallback:", error);
      // Use keyword-based fallback
      return AIService.fallbackMapping(headers);
    }
  }

  /**
   * Detect date format from sample values
   */
  static detectDateFormat(samples: string[]): DateFormatDetection {
    const formats: Record<string, number> = {};

    for (const sample of samples) {
      const format = this.guessDateFormat(sample);
      if (format) {
        formats[format] = (formats[format] || 0) + 1;
      }
    }

    // Find most common format
    const entries = Object.entries(formats).sort((a, b) => b[1] - a[1]);
    const bestFormat = entries[0]?.[0];
    const confidence = entries[0]?.[1] || 0;
    const total = samples.filter((s) => s).length;

    return {
      format: bestFormat || DATE_FORMATS.ISO,
      confidence: total > 0 ? confidence / total : 0,
      samples,
    };
  }

  /**
   * Guess date format from a single date string
   */
  private static guessDateFormat(dateString: string): string | null {
    if (!dateString) return null;

    const cleaned = dateString.trim().replace(/\s+/g, "");

    // ISO format: YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(cleaned)) {
      return DATE_FORMATS.ISO;
    }

    // US format: MM/DD/YYYY or MM-DD-YYYY
    if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(cleaned)) {
      const parts = cleaned.split(/[-/]/);
      if (parseInt(parts[0]) > 12) {
        // First part > 12 must be day -> DD/MM/YYYY
        return DATE_FORMATS.EU;
      }
      return DATE_FORMATS.US;
    }

    // Vietnamese/EU format: DD/MM/YYYY or DD-MM-YYYY
    if (/^\d{1,2}[/.]\d{1,2}[/.]\d{4}/.test(cleaned)) {
      return DATE_FORMATS.VN;
    }

    // DOT format: DD.MM.YYYY (German/Vietnamese style)
    if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(cleaned)) {
      return DATE_FORMATS.DOT;
    }

    // Text format: MMM DD, YYYY or DD MMM, YYYY
    if (/[A-Za-z]{3}/.test(cleaned)) {
      return DATE_FORMATS.TEXT;
    }

    return null;
  }

  /**
   * Parse date with specified format
   */
  static parseDate(dateString: string, format: string): Date {
    if (!dateString) {
      throw new Error("Date string is empty");
    }

    const cleaned = dateString.trim();

    // Try ISO format first
    const isoMatch = cleaned.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (isoMatch && format === DATE_FORMATS.ISO) {
      const [, year, month, day] = isoMatch;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // US format: MM/DD/YYYY
    if (format === DATE_FORMATS.US) {
      const usMatch = cleaned.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (usMatch) {
        const [, month, day, year] = usMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }

    // Vietnamese/EU format: DD/MM/YYYY
    if (format === DATE_FORMATS.EU || format === DATE_FORMATS.VN) {
      const euMatch = cleaned.match(/(\d{1,2})[/.](\d{1,2})[/.](\d{4})/);
      if (euMatch) {
        const [, day, month, year] = euMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }

    // DOT format: DD.MM.YYYY
    if (format === DATE_FORMATS.DOT) {
      const dotMatch = cleaned.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
      if (dotMatch) {
        const [, day, month, year] = dotMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    }

    // Try native Date parsing as last resort
    const nativeDate = new Date(cleaned);
    if (!isNaN(nativeDate.getTime())) {
      return nativeDate;
    }

    throw new Error(`Unable to parse date: ${dateString} with format: ${format}`);
  }

  /**
   * Parse amount with support for various formats
   * Handles Vietnamese format (dot decimal separator) and US/UK format (comma separator)
   */
  static parseAmount(amountString: string): number {
    if (!amountString) {
      throw new Error("Amount string is empty");
    }

    const cleaned = amountString.trim().replace(/\s/g, "");

    // Remove currency symbols and quotes
    const normalized = cleaned.replace(/[$€£¥"'"]/g, "");

    // Handle Vietnamese format: 1.234,56 or 1.234.56 (dot as thousands separator)
    // If format is X.XXX,XX or X.XXX.XX -> comma is decimal
    if (/,(\d{2})$/.test(normalized)) {
      // Format: 1.234,56 or 1,234,56
      const withDotDecimal = normalized.replace(/\./g, "").replace(",", ".");
      return parseFloat(withDotDecimal);
    }

    // Handle US/UK format: 1,234.56 or 1234.56
    // Remove thousand separators (commas)
    const usFormat = normalized.replace(/,/g, "");
    const parsed = parseFloat(usFormat);

    if (isNaN(parsed)) {
      throw new Error(`Unable to parse amount: ${amountString}`);
    }

    return parsed;
  }

  /**
   * Validate a single CSV row against required fields
   */
  static validateRow(
    row: CsvRow,
    mapping: ColumnMapping,
    options: ImportOptions
  ): RowValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    for (const field of REQUIRED_FIELDS) {
      const csvColumn = (mapping as Record<string, string>)[field];

      if (!csvColumn) {
        errors.push(`Required field "${field}" is not mapped`);
        continue;
      }

      const value = row[csvColumn];

      if (!value || value.trim() === "") {
        errors.push(`Required field "${field}" is empty`);
      }
    }

    // Validate date if mapped
    if (mapping.date) {
      try {
        const dateFormat = options.dateFormat || DATE_FORMATS.ISO;
        this.parseDate(row[mapping.date], dateFormat);
      } catch {
        errors.push(
          `Invalid date format: "${row[mapping.date]}". Expected format: ${options.dateFormat || "auto"}`
        );
      }
    }

    // Validate amount if mapped
    if (mapping.amount) {
      try {
        this.parseAmount(row[mapping.amount]);
      } catch {
        errors.push(`Invalid amount format: "${row[mapping.amount]}"`);
      }
    }

    // Warnings for missing optional fields
    if (!mapping.merchant && !options.defaultCategoryId) {
      warnings.push('No "merchant" column mapped');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Map CSV row to transaction input
   */
  static mapRowToTransaction(
    row: CsvRow,
    mapping: ColumnMapping,
    options: ImportOptions
  ): TransactionFromCsv {
    const dateFormat = options.dateFormat || DATE_FORMATS.ISO;

    // Parse date
    const dateValue = mapping.date ? row[mapping.date] : "";
    const parsedDate = this.parseDate(dateValue, dateFormat);

    // Parse amount
    const amountValue = mapping.amount ? row[mapping.amount] : "0";
    const amount = this.parseAmount(amountValue);

    // Get description
    const description = mapping.description ? row[mapping.description] : "Imported Transaction";

    // Get merchant (optional)
    const merchantName = mapping.merchant ? row[mapping.merchant] : null;

    // Use target account from options
    const accountId = options.targetAccountId || "";

    return {
      accountId,
      categoryId: options.defaultCategoryId,
      date: parsedDate.toISOString().split("T")[0],
      amount,
      description,
      merchantName,
      status: "POSTED",
    };
  }

  /**
   * Check for duplicate transactions
   * Duplicates identified by: same date + amount + description (within same account)
   */
  static async checkDuplicates(
    db: D1Database,
    userId: string,
    transactions: TransactionFromCsv[]
  ): Promise<Set<number>> {
    const duplicates = new Set<number>();

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];

      // Check if similar transaction exists
      const result = await db
        .prepare(
          `SELECT id FROM transactions
           WHERE user_id = ?
             AND account_id = ?
             AND date = ?
             AND amount = ?
             AND description = ?
           LIMIT 1`
        )
        .bind(userId, tx.accountId, tx.date, tx.amount, tx.description)
        .first<{ id: string }>();

      if (result) {
        duplicates.add(i);
      }
    }

    return duplicates;
  }

  /**
   * Import transactions from parsed CSV data
   */
  static async importTransactions(
    db: D1Database,
    userId: string,
    rows: CsvRow[],
    mapping: ColumnMapping,
    options: ImportOptions
  ): Promise<ImportResult> {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    const transactionsToImport: TransactionFromCsv[] = [];

    // Validate and map all rows
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const validation = this.validateRow(row, mapping, options);

      if (!validation.valid) {
        for (const error of validation.errors) {
          errors.push({
            row: i + 1,
            field: "unknown",
            value: JSON.stringify(row),
            message: error,
          });
        }
        continue;
      }

      // Add warnings
      for (const warning of validation.warnings) {
        warnings.push({
          row: i + 1,
          field: "warning",
          message: warning,
        });
      }

      try {
        const transaction = this.mapRowToTransaction(row, mapping, options);
        transactionsToImport.push(transaction);
      } catch (error) {
        errors.push({
          row: i + 1,
          field: "mapping",
          value: JSON.stringify(row),
          message: error instanceof Error ? error.message : "Failed to map row",
        });
      }
    }

    // Check for duplicates
    const duplicateIndices = await this.checkDuplicates(
      db,
      userId,
      transactionsToImport
    );

    // Import transactions (skip duplicates and dry runs)
    let imported = 0;
    let failed = 0;

    if (!options.dryRun) {
      for (let i = 0; i < transactionsToImport.length; i++) {
        if (duplicateIndices.has(i)) {
          continue; // Skip duplicates
        }

        try {
          await transactionsCrud.createTransaction(
            db,
            userId,
            transactionsToImport[i] as CreateTransactionInput
          );
          imported++;
        } catch (error) {
          failed++;
          errors.push({
            row: i + 1,
            field: "database",
            value: JSON.stringify(transactionsToImport[i]),
            message: error instanceof Error ? error.message : "Failed to insert",
          });
        }
      }
    }

    return {
      success: failed === 0,
      imported,
      failed,
      duplicates: duplicateIndices.size,
      errors,
      warnings,
    };
  }

  /**
   * Validate CSV file before processing
   */
  static async validateCsvFile(file: File): Promise<{ valid: boolean; error?: string }> {
    // Check file type
    if (!file.name.endsWith(".csv") && file.type !== "text/csv") {
      return {
        valid: false,
        error: "Invalid file type. Please upload a CSV file.",
      };
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return {
        valid: false,
        error: "File size exceeds 10MB limit.",
      };
    }

    // Check if file is not empty
    if (file.size === 0) {
      return {
        valid: false,
        error: "File is empty.",
      };
    }

    return { valid: true };
  }
}

// Import AIService for fallback mapping
import { AIService } from "./ai.server";
