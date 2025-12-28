/**
 * Queue Consumer Worker
 * Processes async jobs for OCR and CSV parsing
 *
 * Jobs:
 * - OCR: Download receipt images from R2, send to Workers AI (Llama 3.2 Vision),
 *        parse JSON response, update receipt record, create pending transaction
 * - CSV Parse: Parse CSV data, apply column mapping, create transactions,
 *             update import status
 *
 * @see PRD lines 61-64
 */

import type {
  MessageBatch,
  D1Database,
  Ai,
  R2Bucket,
  Queue,
} from "@cloudflare/workers-types";

// ============================================================================
// Types
// ============================================================================

export interface QueueMessage {
  type: "ocr" | "csv_parse";
  receiptId?: string;
  transactionImportId?: string;
  userId: string;
}

export interface Env {
  DB: D1Database;
  AI: Ai;
  RECEIPTS_BUCKET: R2Bucket;
  QUEUE: Queue<QueueMessage>;
}

// ============================================================================
// Queue Handler
// ============================================================================

export default {
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const body = JSON.parse(String(message.body)) as QueueMessage;

        // Route to appropriate processor
        if (body.type === "ocr" && body.receiptId) {
          await processOCR(env, body.receiptId, body.userId);
        } else if (body.type === "csv_parse" && body.transactionImportId) {
          await processCSV(env, body.transactionImportId, body.userId);
        } else {
          console.error("Invalid queue message:", body);
        }

        message.ack();
      } catch (error) {
        console.error("Queue processing error:", error);

        // Don't retry on validation errors
        if (error instanceof TypeError || error instanceof SyntaxError) {
          message.ack();
        }
        // Other errors will be retried by Cloudflare Queue automatically
      }
    }
  },
};

// ============================================================================
// OCR Processing
// ============================================================================

interface ReceiptRecord {
  id: string;
  user_id: string;
  image_url: string;
  status: string;
  extracted_data: string | null;
  confidence: number;
  error_message: string | null;
}

async function processOCR(env: Env, receiptId: string, userId: string): Promise<void> {
  // Update status to processing
  await env.DB.prepare(
    `UPDATE receipts
     SET status = 'processing', updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  )
    .bind(receiptId, userId)
    .run();

  try {
    // Get receipt record
    const receipt = await env.DB
      .prepare(`SELECT * FROM receipts WHERE id = ? AND user_id = ?`)
      .bind(receiptId, userId)
      .first<ReceiptRecord>();

    if (!receipt) {
      throw new Error(`Receipt not found: ${receiptId}`);
    }

    // Download image from R2
    const imageUrl = new URL(receipt.image_url);
    const imageKey = imageUrl.pathname.slice(1); // Remove leading slash

    const object = await env.RECEIPTS_BUCKET.get(imageKey);

    if (!object) {
      throw new Error(`Image not found in R2: ${imageKey}`);
    }

    // Convert image to base64
    const imageBuffer = await object.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = object.httpMetadata?.contentType || "image/jpeg";

    // Build OCR prompt (multi-language support)
    const prompt = buildOCRPrompt();

    // Send to Workers AI (Llama 3.2 Vision as per PRD)
    const aiResponse = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
      image: [`data:${mimeType};base64,${base64Image}`],
      prompt: prompt,
      max_tokens: 2048,
    } as any);

    // Extract text from response
    const extractedText = (aiResponse as any).response || (aiResponse as any).text || "";

    // Parse JSON response
    const extractedData = parseOCRResponse(extractedText);

    // Calculate confidence based on data completeness
    const confidence = calculateConfidence(extractedData);

    // Determine final status
    const status =
      confidence >= 0.7
        ? "completed"
        : confidence >= 0.4
        ? "needs_review"
        : "failed";

    // Update receipt with extracted data
    await env.DB.prepare(
      `UPDATE receipts
       SET status = ?,
           extracted_data = ?,
           confidence = ?,
           processed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
      .bind(
        status,
        JSON.stringify(extractedData),
        confidence,
        receiptId,
        userId
      )
      .run();

    // Create pending transaction if extraction successful
    if (status === "completed" && extractedData.totalAmount) {
      await createPendingTransaction(env, userId, extractedData, receipt.image_url);
    }
  } catch (error) {
    // Update receipt status to failed
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await env.DB.prepare(
      `UPDATE receipts
       SET status = 'failed',
           error_message = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
      .bind(errorMessage, receiptId, userId)
      .run();

    throw error;
  }
}

function buildOCRPrompt(): string {
  return `Extract the following information from this receipt and return as JSON:
{
  "merchantName": "name of store/restaurant",
  "date": "transaction date (YYYY-MM-DD format)",
  "totalAmount": "total amount as number",
  "currency": "currency code (USD, VND, etc.)",
  "taxAmount": "tax amount if present",
  "lineItems": [
    {
      "description": "item name",
      "quantity": "number",
      "unitPrice": "price per unit",
      "totalPrice": "total price"
    }
  ]
}

If a field cannot be determined, use null. Return only valid JSON.`;
}

interface ExtractedReceiptData {
  merchantName: string | null;
  date: string | null;
  totalAmount: number | null;
  currency: string | null;
  taxAmount: number | null;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

function parseOCRResponse(responseText: string): ExtractedReceiptData {
  try {
    // Extract JSON from markdown code blocks or plain JSON
    const jsonMatch =
      responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
      responseText.match(/```\s*([\s\S]*?)\s*```/) ||
      responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const jsonString = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonString);

    return {
      merchantName: parsed.merchantName || null,
      date: parsed.date || null,
      totalAmount: parsed.totalAmount ? Number(parsed.totalAmount) : null,
      currency: parsed.currency || null,
      taxAmount: parsed.taxAmount ? Number(parsed.taxAmount) : null,
      lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
    };
  } catch (error) {
    console.error("Failed to parse OCR response:", error);

    // Return empty data on parse failure
    return {
      merchantName: null,
      date: null,
      totalAmount: null,
      currency: null,
      taxAmount: null,
      lineItems: [],
    };
  }
}

function calculateConfidence(data: ExtractedReceiptData): number {
  let score = 0;
  let maxScore = 4;

  if (data.merchantName) score += 1;
  if (data.totalAmount && data.totalAmount > 0) score += 1;
  if (data.date) score += 1;
  if (data.currency) score += 1;

  // Bonus for line items
  if (data.lineItems && data.lineItems.length > 0) {
    score += 0.5;
    maxScore += 0.5;
  }

  return score / maxScore;
}

async function createPendingTransaction(
  env: Env,
  userId: string,
  data: ExtractedReceiptData,
  receiptUrl: string
): Promise<void> {
  // Get user's default account
  const account = await env.DB
    .prepare(
      `SELECT id FROM financial_accounts
       WHERE user_id = ? AND type = 'CHECKING' AND is_archived = 0
       ORDER BY name
       LIMIT 1`
    )
    .bind(userId)
    .first<{ id: string }>();

  if (!account) {
    console.log("No default account found, skipping transaction creation");
    return;
  }

  const transactionId = crypto.randomUUID();

  // Create pending transaction
  await env.DB.prepare(
    `INSERT INTO transactions (
      id, user_id, account_id, date, amount, description,
      merchant_name, status, receipt_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      transactionId,
      userId,
      account.id,
      data.date || new Date().toISOString().split("T")[0],
      -(data.totalAmount || 0), // Expense is negative
      data.merchantName || "Receipt Purchase",
      data.merchantName || null,
      "PENDING",
      receiptUrl
    )
    .run();
}

// ============================================================================
// CSV Processing
// ============================================================================

interface ImportRecord {
  id: string;
  user_id: string;
  file_url: string;
  column_mapping: string | null;
  import_options: string | null;
  total_rows: number;
}

interface ColumnMapping {
  date?: string;
  amount?: string;
  description?: string;
  merchant?: string;
  category?: string;
  account?: string;
}

interface ImportOptions {
  targetAccountId?: string;
  defaultCategoryId?: string;
  dateFormat?: string;
  skipHeaderRow?: boolean;
}

async function processCSV(env: Env, importId: string, userId: string): Promise<void> {
  // Update status to processing
  await env.DB.prepare(
    `UPDATE transaction_imports
     SET status = 'processing', updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  )
    .bind(importId, userId)
    .run();

  try {
    // Get import record
    const importRecord = await env.DB
      .prepare(`SELECT * FROM transaction_imports WHERE id = ? AND user_id = ?`)
      .bind(importId, userId)
      .first<ImportRecord>();

    if (!importRecord) {
      throw new Error(`Import not found: ${importId}`);
    }

    // Download CSV from R2
    const fileUrl = new URL(importRecord.file_url);
    const fileKey = fileUrl.pathname.slice(1);

    const object = await env.RECEIPTS_BUCKET.get(fileKey);

    if (!object) {
      throw new Error(`CSV file not found in R2: ${fileKey}`);
    }

    const csvText = await object.text();

    // Parse mapping and options
    const columnMapping = importRecord.column_mapping
      ? (JSON.parse(importRecord.column_mapping) as ColumnMapping)
      : null;
    const importOptions = importRecord.import_options
      ? (JSON.parse(importRecord.import_options) as ImportOptions)
      : {};

    // Parse CSV using PapaParse
    const Papa = await import("papaparse");
    const parseResult = Papa.parse(csvText, {
      header: false,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    if (parseResult.errors.length > 0) {
      throw new Error(`CSV parsing failed: ${parseResult.errors[0].message}`);
    }

    const rows = parseResult.data as string[][];

    if (rows.length === 0) {
      throw new Error("CSV file is empty");
    }

    // Skip header row if configured
    let startIndex = 0;
    if (importOptions.skipHeaderRow !== false) {
      startIndex = 1;
    }

    const dataRows = rows.slice(startIndex);
    const headers = rows[0];

    // Update total rows
    await env.DB.prepare(
      `UPDATE transaction_imports SET total_rows = ? WHERE id = ?`
    )
      .bind(dataRows.length, importId)
      .run();

    // Process rows
    let importedCount = 0;
    let failedCount = 0;
    let duplicateCount = 0;

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = startIndex + i + 1;

      try {
        // Map row data to fields
        const mappedData = mapRowToTransaction(
          row,
          headers,
          columnMapping,
          importOptions
        );

        // Check for duplicates
        const isDuplicate = await checkDuplicate(env, userId, mappedData);

        if (isDuplicate) {
          duplicateCount++;
          await logImportError(env, importId, rowNum, null, null, "Duplicate transaction", "duplicate");
          continue;
        }

        // Create transaction
        await createTransactionFromCSV(env, userId, mappedData, importOptions);
        importedCount++;
      } catch (error) {
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";

        await logImportError(env, importId, rowNum, null, null, errorMessage, "parsing");
      }
    }

    // Update import status
    const finalStatus =
      importedCount > 0
        ? failedCount === 0
          ? "completed"
          : "partial"
        : "failed";

    await env.DB.prepare(
      `UPDATE transaction_imports
       SET status = ?,
           imported_count = ?,
           failed_count = ?,
           duplicate_count = ?,
           processed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(finalStatus, importedCount, failedCount, duplicateCount, importId)
      .run();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await env.DB.prepare(
      `UPDATE transaction_imports
       SET status = 'failed',
           error_summary = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
      .bind(JSON.stringify([{ message: errorMessage }]), importId)
      .run();

    throw error;
  }
}

function mapRowToTransaction(
  row: string[],
  headers: string[],
  columnMapping: ColumnMapping | null,
  importOptions: ImportOptions
): {
  date: string;
  amount: number;
  description: string;
  merchantName?: string;
} {
  const getFieldIndex = (fieldName?: string): number | null => {
    if (!fieldName || !columnMapping) return null;
    const index = headers.findIndex(
      (h) => h.toLowerCase() === fieldName.toLowerCase()
    );
    return index >= 0 ? index : null;
  };

  // Use explicit mapping if provided
  if (columnMapping) {
    const dateIdx = getFieldIndex(columnMapping.date) ?? 0;
    const amountIdx = getFieldIndex(columnMapping.amount) ?? 1;
    const descIdx = getFieldIndex(columnMapping.description) ?? 2;
    const merchantIdx = getFieldIndex(columnMapping.merchant);

    return {
      date: row[dateIdx]?.trim() || "",
      amount: parseFloat(row[amountIdx]?.replace(/[^0-9.-]/g, "") || "0") || 0,
      description: row[descIdx]?.trim() || "",
      merchantName: merchantIdx !== null ? row[merchantIdx]?.trim() : undefined,
    };
  }

  // Default mapping: assume date, amount, description order
  return {
    date: row[0]?.trim() || "",
    amount: parseFloat(row[1]?.replace(/[^0-9.-]/g, "") || "0") || 0,
    description: row[2]?.trim() || "",
    merchantName: row[3]?.trim(),
  };
}

async function checkDuplicate(
  env: Env,
  userId: string,
  data: { date: string; amount: number; description: string }
): Promise<boolean> {
  const result = await env.DB
    .prepare(
      `SELECT COUNT(*) as count FROM transactions
       WHERE user_id = ? AND date = ? AND amount = ? AND description = ?`
    )
    .bind(userId, data.date, data.amount, data.description)
    .first<{ count: number }>();

  return (result?.count || 0) > 0;
}

async function createTransactionFromCSV(
  env: Env,
  userId: string,
  data: { date: string; amount: number; description: string; merchantName?: string },
  options: ImportOptions
): Promise<void> {
  const accountId =
    options.targetAccountId ||
    (
      await env.DB
        .prepare(
          `SELECT id FROM financial_accounts
           WHERE user_id = ? AND type = 'CHECKING' AND is_archived = 0
           LIMIT 1`
        )
        .bind(userId)
        .first<{ id: string }>()
    )?.id;

  if (!accountId) {
    throw new Error("No target account available");
  }

  const transactionId = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO transactions (
      id, user_id, account_id, category_id, date, amount,
      description, merchant_name, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      transactionId,
      userId,
      accountId,
      options.defaultCategoryId || null,
      data.date,
      data.amount,
      data.description,
      data.merchantName || null,
      "POSTED"
    )
    .run();
}

async function logImportError(
  env: Env,
  importId: string,
  rowNumber: number,
  field: string | null,
  value: string | null,
  errorMessage: string,
  errorType: string
): Promise<void> {
  const errorId = crypto.randomUUID();

  await env.DB.prepare(
    `INSERT INTO transaction_import_errors (
      id, import_id, row_number, field, value, error_message, error_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(errorId, importId, rowNumber, field, value, errorMessage, errorType)
    .run();
}
