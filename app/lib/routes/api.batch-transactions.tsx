/**
 * API Route: Batch Transaction Operations
 *
 * Provides endpoints for performing batch operations on transactions.
 * Supports bulk categorize, delete, and status updates.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import {
  executeBatchOperation,
  previewBatchOperation,
  validateBatchOperationRequest,
  type BatchOperationRequest,
  type BatchOperationType,
} from "~/lib/services/batch-operations.server";

/**
 * GET /api/batch-transactions
 * Get batch operation limits and available operations
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);

  return Response.json({
    availableOperations: [
      {
        type: "categorize",
        label: "Categorize",
        description: "Assign category to selected transactions",
        requiresData: { categoryId: true },
      },
      {
        type: "delete",
        label: "Delete",
        description: "Delete selected transactions permanently",
        requiresData: {},
        isDestructive: true,
      },
      {
        type: "mark_reconciled",
        label: "Mark as Reconciled",
        description: "Mark transactions as reconciled",
        requiresData: {},
      },
      {
        type: "mark_posted",
        label: "Mark as Posted",
        description: "Mark transactions as posted/unreconciled",
        requiresData: {},
      },
      {
        type: "mark_pending",
        label: "Mark as Pending",
        description: "Mark transactions as pending",
        requiresData: {},
      },
    ],
    limits: {
      maxTransactions: 100,
      maxDeletePerBatch: 50,
    },
  });
}

/**
 * POST /api/batch-transactions
 * Execute batch operation on transactions
 *
 * Request body:
 * {
 *   "type": "categorize" | "delete" | "mark_reconciled" | "mark_posted" | "mark_pending",
 *   "transactionIds": ["id1", "id2", ...],
 *   "data": {
 *     "categoryId": "category-id",  // for categorize
 *     "notes": "Updated notes",
 *     "tags": "tag1,tag2"
 *   }
 * }
 */
export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Only accept POST requests
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();

    // Build batch operation request
    const batchRequest: BatchOperationRequest = {
      type: body.type as BatchOperationType,
      transactionIds: body.transactionIds || [],
      userId: user.id,
      data: body.data,
    };

    // Validate request
    const validation = validateBatchOperationRequest(batchRequest);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Execute batch operation
    const result = await executeBatchOperation(db, batchRequest);

    const status = result.success ? 200 : 207; // 207 for multi-status
    return Response.json(result, {
      status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Batch operation error:", error);
    return Response.json(
      {
        error: "Failed to execute batch operation",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
