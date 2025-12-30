/**
 * Batch Operations Service
 *
 * Provides functionality for performing batch operations on transactions.
 * Supports bulk categorize, delete, and status updates with proper validation.
 */

import type { D1Database } from "@cloudflare/workers-types";

/**
 * Batch operation types
 */
export type BatchOperationType =
  | "categorize"
  | "delete"
  | "mark_reconciled"
  | "mark_unreconciled"
  | "mark_posted"
  | "mark_pending";

/**
 * Batch operation request
 */
export interface BatchOperationRequest {
  type: BatchOperationType;
  transactionIds: string[];
  userId: string;
  data?: {
    categoryId?: string;
    notes?: string;
    tags?: string;
  };
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ transactionId: string; error: string }>;
}

/**
 * Validate transaction ownership
 */
async function validateTransactionOwnership(
  db: D1Database,
  transactionIds: string[],
  userId: string
): Promise<{ valid: string[]; invalid: string[] }> {
  if (transactionIds.length === 0) {
    return { valid: [], invalid: [] };
  }

  // Check which transactions belong to the user
  const placeholders = transactionIds.map(() => "?").join(",");
  const result = await db
    .prepare(
      `SELECT id FROM transactions WHERE id IN (${placeholders}) AND user_id = ?`
    )
    .bind(...transactionIds, userId)
    .all();

  const validIds = new Set((result.results as Array<{ id: string }> || []).map((row) => row.id));
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const id of transactionIds) {
    if (validIds.has(id)) {
      valid.push(id);
    } else {
      invalid.push(id);
    }
  }

  return { valid, invalid };
}

/**
 * Perform bulk categorize operation
 */
async function bulkCategorize(
  db: D1Database,
  transactionIds: string[],
  categoryId: string
): Promise<number> {
  if (transactionIds.length === 0) return 0;

  const placeholders = transactionIds.map(() => "?").join(",");
  const result = await db
    .prepare(
      `UPDATE transactions SET category_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id IN (${placeholders})`
    )
    .bind(categoryId, ...transactionIds)
    .run();

  return result.meta?.changes || 0;
}

/**
 * Perform bulk delete operation
 */
async function bulkDelete(
  db: D1Database,
  transactionIds: string[]
): Promise<number> {
  if (transactionIds.length === 0) return 0;

  const placeholders = transactionIds.map(() => "?").join(",");
  const result = await db
    .prepare(`DELETE FROM transactions WHERE id IN (${placeholders})`)
    .bind(...transactionIds)
    .run();

  return result.meta?.changes || 0;
}

/**
 * Perform bulk status update operation
 */
async function bulkUpdateStatus(
  db: D1Database,
  transactionIds: string[],
  status: "POSTED" | "RECONCILED" | "PENDING"
): Promise<number> {
  if (transactionIds.length === 0) return 0;

  const placeholders = transactionIds.map(() => "?").join(",");
  const result = await db
    .prepare(
      `UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id IN (${placeholders})`
    )
    .bind(status, ...transactionIds)
    .run();

  return result.meta?.changes || 0;
}

/**
 * Perform bulk notes update
 */
async function bulkUpdateNotes(
  db: D1Database,
  transactionIds: string[],
  notes: string,
  append: boolean = false
): Promise<number> {
  if (transactionIds.length === 0) return 0;

  let query: string;
  let params: (string | number)[];

  if (append) {
    const placeholders = transactionIds.map(() => "?").join(",");
    query = `UPDATE transactions SET notes = COALESCE(notes, '') || ? || ', ' || ?, updated_at = CURRENT_TIMESTAMP
             WHERE id IN (${placeholders})`;
    params = [notes, notes, ...transactionIds];
  } else {
    const placeholders = transactionIds.map(() => "?").join(",");
    query = `UPDATE transactions SET notes = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id IN (${placeholders})`;
    params = [notes, ...transactionIds];
  }

  const result = await db.prepare(query).bind(...params).run();
  return result.meta?.changes || 0;
}

/**
 * Perform bulk tags update
 */
async function bulkUpdateTags(
  db: D1Database,
  transactionIds: string[],
  tags: string,
  replace: boolean = false
): Promise<number> {
  if (transactionIds.length === 0) return 0;

  let query: string;
  let params: (string | number)[];

  if (replace) {
    const placeholders = transactionIds.map(() => "?").join(",");
    query = `UPDATE transactions SET tags = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id IN (${placeholders})`;
    params = [tags, ...transactionIds];
  } else {
    const placeholders = transactionIds.map(() => "?").join(",");
    query = `UPDATE transactions SET tags = COALESCE(tags, '') || ? || ', ' || ?, updated_at = CURRENT_TIMESTAMP
             WHERE id IN (${placeholders})`;
    params = [tags, tags, ...transactionIds];
  }

  const result = await db.prepare(query).bind(...params).run();
  return result.meta?.changes || 0;
}

/**
 * Execute batch operation
 */
export async function executeBatchOperation(
  db: D1Database,
  request: BatchOperationRequest
): Promise<BatchOperationResult> {
  const { type, transactionIds, userId, data } = request;
  const errors: Array<{ transactionId: string; error: string }> = [];
  let processed = 0;

  // Validate transaction ownership
  const { valid, invalid } = await validateTransactionOwnership(
    db,
    transactionIds,
    userId
  );

  // Add errors for invalid transaction IDs
  for (const id of invalid) {
    errors.push({ transactionId: id, error: "Transaction not found or access denied" });
  }

  if (valid.length === 0) {
    return {
      success: errors.length === 0,
      processed: 0,
      failed: errors.length,
      errors,
    };
  }

  // Execute operation based on type
  try {
    switch (type) {
      case "categorize": {
        if (!data?.categoryId) {
          throw new Error("Category ID is required for categorize operation");
        }
        processed = await bulkCategorize(db, valid, data.categoryId);
        break;
      }

      case "delete": {
        processed = await bulkDelete(db, valid);
        break;
      }

      case "mark_reconciled": {
        processed = await bulkUpdateStatus(db, valid, "RECONCILED");
        break;
      }

      case "mark_unreconciled":
      case "mark_posted": {
        processed = await bulkUpdateStatus(db, valid, "POSTED");
        break;
      }

      case "mark_pending": {
        processed = await bulkUpdateStatus(db, valid, "PENDING");
        break;
      }

      default: {
        throw new Error(`Unknown batch operation type: ${type}`);
      }
    }

    // Handle additional data updates
    if (data?.notes !== undefined && valid.length > 0) {
      await bulkUpdateNotes(db, valid, data.notes);
    }

    if (data?.tags !== undefined && valid.length > 0) {
      await bulkUpdateTags(db, valid, data.tags);
    }
  } catch (error) {
    // Add all transaction IDs as failed if operation failed
    for (const id of valid) {
      errors.push({
        transactionId: id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    success: errors.length === 0 && processed > 0,
    processed,
    failed: errors.length + (valid.length - processed),
    errors,
  };
}

/**
 * Get batch operation preview
 * Shows what would be affected without making changes
 */
export async function previewBatchOperation(
  db: D1Database,
  transactionIds: string[],
  userId: string
): Promise<{
  valid: number;
  invalid: number;
  preview: Array<{ id: string; date: string; description: string; amount: number }>;
}> {
  const { valid, invalid } = await validateTransactionOwnership(
    db,
    transactionIds,
    userId
  );

  // Get preview of valid transactions
  let preview: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
  }> = [];

  if (valid.length > 0) {
    const placeholders = valid.map(() => "?").join(",");
    const result = await db
      .prepare(
        `SELECT id, date, description, amount
         FROM transactions
         WHERE id IN (${placeholders})
         ORDER BY date DESC`
      )
      .bind(...valid)
      .all();

    preview = (result.results as Array<{ id: string; date: string; description: string; amount: number }> || []).map((row) => ({
      id: row.id,
      date: row.date,
      description: row.description,
      amount: row.amount,
    }));
  }

  return {
    valid: valid.length,
    invalid: invalid.length,
    preview,
  };
}

/**
 * Batch operation limits
 */
export const BATCH_OPERATION_LIMITS = {
  maxTransactions: 100,
  maxDeletePerBatch: 50,
};

/**
 * Validate batch operation request
 */
export function validateBatchOperationRequest(
  request: BatchOperationRequest
): { valid: boolean; error?: string } {
  if (request.transactionIds.length === 0) {
    return { valid: false, error: "No transaction IDs provided" };
  }

  if (request.transactionIds.length > BATCH_OPERATION_LIMITS.maxTransactions) {
    return {
      valid: false,
      error: `Maximum ${BATCH_OPERATION_LIMITS.maxTransactions} transactions per batch operation`,
    };
  }

  if (request.type === "delete" && request.transactionIds.length > BATCH_OPERATION_LIMITS.maxDeletePerBatch) {
    return {
      valid: false,
      error: `Maximum ${BATCH_OPERATION_LIMITS.maxDeletePerBatch} transactions per delete batch`,
    };
  }

  if (request.type === "categorize" && !request.data?.categoryId) {
    return { valid: false, error: "Category ID is required for categorize operation" };
  }

  return { valid: true };
}
