/**
 * Queue Service for async OCR and CSV processing
 * Enqueues processing jobs for the queue consumer worker
 *
 * @see /workers/queue-consumer.ts
 */

import type { CloudflareRequest } from "../auth/db.server";

// ============================================================================
// Queue Message Types (matching queue-consumer.ts)
// ============================================================================

export interface OcrQueueMessage {
  type: "ocr";
  receiptId: string;
  userId: string;
}

export interface CsvParseQueueMessage {
  type: "csv_parse";
  transactionImportId: string;
  userId: string;
}

export type QueueMessage = OcrQueueMessage | CsvParseQueueMessage;

// ============================================================================
// OCR Queue Operations
// ============================================================================

/**
 * Enqueue OCR processing job for a receipt
 * The queue consumer will:
 * 1. Download image from R2
 * 2. Send to Workers AI (Llama 3.2 Vision)
 * 3. Parse JSON response
 * 4. Create pending transaction
 *
 * @param request - Request object with Cloudflare context
 * @param receiptId - Receipt ID to process
 * @param userId - User ID for authorization
 */
export async function enqueueOcrJob(
  request: CloudflareRequest,
  receiptId: string,
  userId: string
): Promise<void> {
  const queue = request.context?.cloudflare?.env?.QUEUE;

  if (!queue) {
    throw new Error("Queue binding not available");
  }

  const message: OcrQueueMessage = {
    type: "ocr",
    receiptId,
    userId,
  };

  try {
    await queue.send(JSON.stringify(message));
  } catch (error) {
    console.error("Failed to enqueue OCR job:", error);
    throw new Error(
      `Failed to enqueue OCR job: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Enqueue bulk OCR processing jobs
 *
 * @param request - Request object with Cloudflare context
 * @param jobs - Array of { receiptId, userId } tuples
 */
export async function enqueueBulkOcrJobs(
  request: CloudflareRequest,
  jobs: Array<{ receiptId: string; userId: string }>
): Promise<void> {
  const queue = request.context?.cloudflare?.env?.QUEUE;

  if (!queue) {
    throw new Error("Queue binding not available");
  }

  try {
    const messages: OcrQueueMessage[] = jobs.map((job) => ({
      type: "ocr",
      receiptId: job.receiptId,
      userId: job.userId,
    }));

    await queue.sendBatch(
      messages.map((msg) => ({ body: JSON.stringify(msg) }))
    );
  } catch (error) {
    console.error("Failed to enqueue bulk OCR jobs:", error);
    throw new Error(
      `Failed to enqueue bulk OCR jobs: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

// ============================================================================
// CSV Parse Queue Operations
// ============================================================================

/**
 * Enqueue CSV parsing job for transaction import
 * The queue consumer will:
 * 1. Download CSV from R2
 * 2. Parse CSV data using PapaParse
 * 3. Apply column mapping
 * 4. Create transactions
 * 5. Update import status
 *
 * @param request - Request object with Cloudflare context
 * @param transactionImportId - Import ID to process
 * @param userId - User ID for authorization
 */
export async function enqueueCsvParseJob(
  request: CloudflareRequest,
  transactionImportId: string,
  userId: string
): Promise<void> {
  const queue = request.context?.cloudflare?.env?.QUEUE;

  if (!queue) {
    throw new Error("Queue binding not available");
  }

  const message: CsvParseQueueMessage = {
    type: "csv_parse",
    transactionImportId,
    userId,
  };

  try {
    await queue.send(JSON.stringify(message));
  } catch (error) {
    console.error("Failed to enqueue CSV parse job:", error);
    throw new Error(
      `Failed to enqueue CSV parse job: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Enqueue bulk CSV parsing jobs
 *
 * @param request - Request object with Cloudflare context
 * @param jobs - Array of { transactionImportId, userId } tuples
 */
export async function enqueueBulkCsvParseJobs(
  request: CloudflareRequest,
  jobs: Array<{ transactionImportId: string; userId: string }>
): Promise<void> {
  const queue = request.context?.cloudflare?.env?.QUEUE;

  if (!queue) {
    throw new Error("Queue binding not available");
  }

  try {
    const messages: CsvParseQueueMessage[] = jobs.map((job) => ({
      type: "csv_parse",
      transactionImportId: job.transactionImportId,
      userId: job.userId,
    }));

    await queue.sendBatch(
      messages.map((msg) => ({ body: JSON.stringify(msg) }))
    );
  } catch (error) {
    console.error("Failed to enqueue bulk CSV parse jobs:", error);
    throw new Error(
      `Failed to enqueue bulk CSV parse jobs: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
