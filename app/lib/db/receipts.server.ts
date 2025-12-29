/**
 * Receipt database access layer
 * Handles CRUD operations for receipt records
 */

import type { D1Database } from "@cloudflare/workers-types";
import { getDb } from "../auth/db.server";
import type {
  ReceiptRecord,
  ReceiptWithTransaction,
  ReceiptProcessingStatus,
  ReceiptData,
} from "../types/receipt";

/**
 * Database row format for receipts (snake_case)
 */
interface ReceiptRow {
  id: string;
  user_id: string;
  image_url: string;
  thumbnail_url: string | null;
  status: ReceiptProcessingStatus;
  extracted_data: string; // JSON string
  confidence: number;
  error_message: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

/**
 * Create receipts table
 * Run this migration to add receipts support
 */
export const createReceiptsTable = `
CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'needs_review')),
  extracted_data TEXT NOT NULL, -- JSON
  confidence REAL NOT NULL DEFAULT 0,
  error_message TEXT,
  transaction_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_transaction_id ON receipts(transaction_id);
`;

/**
 * Receipts CRUD operations
 */
export const receiptsCrud = {
  /**
   * Get receipt by ID
   */
  async getReceiptById(
    db: D1Database,
    receiptId: string,
    userId: string
  ): Promise<ReceiptRecord | null> {
    const result = await db
      .prepare(`SELECT * FROM receipts WHERE id = ? AND user_id = ?`)
      .bind(receiptId, userId)
      .first<ReceiptRow>();

    if (!result) {
      return null;
    }

    return mapReceiptRow(result);
  },

  /**
   * Get receipts with filters and pagination
   */
  async getReceipts(
    db: D1Database,
    userId: string,
    filters: {
      status?: ReceiptProcessingStatus;
      startDate?: Date;
      endDate?: Date;
      search?: string;
    } = {},
    pagination: { page: number; pageSize: number } = { page: 1, pageSize: 20 }
  ): Promise<{ receipts: ReceiptRecord[]; total: number }> {
    const conditions: string[] = ["user_id = ?"];
    const params: (string | number)[] = [userId];

    if (filters.status) {
      conditions.push("status = ?");
      params.push(filters.status);
    }

    if (filters.startDate) {
      conditions.push("DATE(created_at) >= ?");
      params.push(filters.startDate.toISOString().split("T")[0]);
    }

    if (filters.endDate) {
      conditions.push("DATE(created_at) <= ?");
      params.push(filters.endDate.toISOString().split("T")[0]);
    }

    if (filters.search) {
      conditions.push("(LOWER(JSON_EXTRACT(extracted_data, '$.merchantName')) LIKE LOWER(?))");
      params.push(`%${filters.search}%`);
    }

    const whereClause = conditions.join(" AND ");

    // Get total count
    const countResult = await db
      .prepare(`SELECT COUNT(*) as count FROM receipts WHERE ${whereClause}`)
      .bind(...params)
      .first<{ count: number }>() as { count: number };

    const total = countResult.count;

    // Get receipts
    const offset = (pagination.page - 1) * pagination.pageSize;
    params.push(pagination.pageSize, offset);

    const receipts = await db
      .prepare(
        `SELECT * FROM receipts
         WHERE ${whereClause}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...params)
      .all();

    const mappedReceipts =
      receipts.results?.map((row: ReceiptRow) => mapReceiptRow(row)) || [];

    return {
      receipts: mappedReceipts,
      total,
    };
  },

  /**
   * Get receipt with transaction details
   */
  async getReceiptWithTransaction(
    db: D1Database,
    receiptId: string,
    userId: string
  ): Promise<ReceiptWithTransaction | null> {
    const result = await db
      .prepare(
        `SELECT
          r.*,
          t.id as transaction_id,
          t.date as transaction_date,
          t.description as transaction_description,
          t.amount as transaction_amount,
          c.name as category_name
        FROM receipts r
        LEFT JOIN transactions t ON r.transaction_id = t.id
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE r.id = ? AND r.user_id = ?`
      )
      .bind(receiptId, userId)
      .first<ReceiptRow & {
        transaction_id: string;
        transaction_date: string;
        transaction_description: string;
        transaction_amount: number;
        category_name: string | null;
      }>();

    if (!result) {
      return null;
    }

    const receipt = mapReceiptRow(result) as ReceiptWithTransaction;

    if (result.transaction_id) {
      receipt.transaction = {
        id: result.transaction_id,
        date: new Date(result.transaction_date),
        description: result.transaction_description,
        amount: result.transaction_amount,
        categoryName: result.category_name || undefined,
      };
    }

    return receipt;
  },

  /**
   * Create new receipt
   */
  async createReceipt(
    db: D1Database,
    data: {
      id: string;
      userId: string;
      imageUrl: string;
      thumbnailUrl?: string;
      status: ReceiptProcessingStatus;
      extractedData: ReceiptData;
      confidence: number;
      errorMessage?: string;
    }
  ): Promise<ReceiptRecord> {
    await db
      .prepare(
        `INSERT INTO receipts (
          id, user_id, image_url, thumbnail_url, status,
          extracted_data, confidence, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        data.id,
        data.userId,
        data.imageUrl,
        data.thumbnailUrl || null,
        data.status,
        JSON.stringify(data.extractedData),
        data.confidence,
        data.errorMessage || null
      )
      .run();

    const receipt = await receiptsCrud.getReceiptById(db, data.id, data.userId);
    if (!receipt) {
      throw new Error("Failed to create receipt");
    }
    return receipt;
  },

  /**
   * Update receipt
   */
  async updateReceipt(
    db: D1Database,
    receiptId: string,
    userId: string,
    updates: {
      status?: ReceiptProcessingStatus;
      extractedData?: ReceiptData;
      confidence?: number;
      errorMessage?: string;
      transactionId?: string | null;
      thumbnailUrl?: string;
      processedAt?: Date | null;
    }
  ): Promise<ReceiptRecord | null> {
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (updates.status !== undefined) {
      fields.push("status = ?");
      params.push(updates.status);
    }

    if (updates.extractedData !== undefined) {
      fields.push("extracted_data = ?");
      params.push(JSON.stringify(updates.extractedData));
    }

    if (updates.confidence !== undefined) {
      fields.push("confidence = ?");
      params.push(updates.confidence);
    }

    if (updates.errorMessage !== undefined) {
      fields.push("error_message = ?");
      params.push(updates.errorMessage);
    }

    if (updates.transactionId !== undefined) {
      fields.push("transaction_id = ?");
      params.push(updates.transactionId);
    }

    if (updates.thumbnailUrl !== undefined) {
      fields.push("thumbnail_url = ?");
      params.push(updates.thumbnailUrl);
    }

    if (updates.processedAt !== undefined) {
      fields.push("processed_at = ?");
      params.push(updates.processedAt ? updates.processedAt.toISOString() : null);
    }

    fields.push("updated_at = CURRENT_TIMESTAMP");

    params.push(receiptId, userId);

    await db
      .prepare(`UPDATE receipts SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`)
      .bind(...params)
      .run();

    return receiptsCrud.getReceiptById(db, receiptId, userId);
  },

  /**
   * Delete receipt
   */
  async deleteReceipt(
    db: D1Database,
    receiptId: string,
    userId: string
  ): Promise<boolean> {
    const result = await db
      .prepare(`DELETE FROM receipts WHERE id = ? AND user_id = ?`)
      .bind(receiptId, userId)
      .run();

    return (result.meta?.changes || 0) > 0;
  },

  /**
   * Link receipt to transaction
   */
  async linkToTransaction(
    db: D1Database,
    receiptId: string,
    userId: string,
    transactionId: string
  ): Promise<void> {
    await db
      .prepare(
        `UPDATE receipts
         SET transaction_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`
      )
      .bind(transactionId, receiptId, userId)
      .run();
  },

  /**
   * Get receipts statistics
   */
  async getReceiptStats(
    db: D1Database,
    userId: string
  ): Promise<{
    total: number;
    pending: number;
    processing: number;
    completed: number;
    needsReview: number;
    failed: number;
  }> {
    const result = await db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'needs_review' THEN 1 ELSE 0 END) as needs_review,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
        FROM receipts
        WHERE user_id = ?`
      )
      .bind(userId)
      .first<{
        total: number;
        pending: number;
        processing: number;
        completed: number;
        needs_review: number;
        failed: number;
      }>();

    return {
      total: result?.total || 0,
      pending: result?.pending || 0,
      processing: result?.processing || 0,
      completed: result?.completed || 0,
      needsReview: result?.needs_review || 0,
      failed: result?.failed || 0,
    };
  },
};

/**
 * Helper function to map database row to ReceiptRecord
 */
function mapReceiptRow(row: ReceiptRow): ReceiptRecord {
  return {
    id: row.id,
    userId: row.user_id,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url || undefined,
    status: row.status,
    extractedData: JSON.parse(row.extracted_data) as ReceiptData,
    confidence: row.confidence,
    errorMessage: row.error_message || undefined,
    transactionId: row.transaction_id || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
  };
}

/**
 * Helper functions for use in routes
 */
export async function getReceiptById(
  request: Request,
  receiptId: string,
  userId: string
): Promise<ReceiptRecord | null> {
  const db = getDb(request);
  return receiptsCrud.getReceiptById(db, receiptId, userId);
}

export async function getUserReceipts(
  request: Request,
  userId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ receipts: ReceiptRecord[]; total: number }> {
  const db = getDb(request);
  return receiptsCrud.getReceipts(db, userId, {}, { page, pageSize });
}

export async function linkReceiptToTransaction(
  request: Request,
  receiptId: string,
  userId: string,
  transactionId: string
): Promise<void> {
  const db = getDb(request);
  await receiptsCrud.linkToTransaction(db, receiptId, userId, transactionId);
}

export async function deleteReceipt(
  request: Request,
  receiptId: string,
  userId: string
): Promise<boolean> {
  const db = getDb(request);
  return receiptsCrud.deleteReceipt(db, receiptId, userId);
}
