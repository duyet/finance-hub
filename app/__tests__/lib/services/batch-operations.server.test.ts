/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Batch Operations Service Tests
 *
 * Tests for bulk transaction operations including:
 * - Transaction ownership validation
 * - Bulk categorize, delete, and status updates
 * - Error handling and edge cases
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import {
  executeBatchOperation,
  previewBatchOperation,
  validateBatchOperationRequest,
  BATCH_OPERATION_LIMITS,
  type BatchOperationRequest,
  type BatchOperationType,
} from "~/lib/services/batch-operations.server";

// Mock D1 database
const mockDb = {
  prepare: vi.fn(),
} as unknown as D1Database;

// Mock result helper
function createMockResult(results: unknown[], meta?: { changes: number }) {
  return { results, meta: meta || { changes: results.length } };
}

describe("validateBatchOperationRequest", () => {
  it("should accept valid batch operation request", () => {
    const request: BatchOperationRequest = {
      type: "categorize",
      transactionIds: ["tx1", "tx2", "tx3"],
      userId: "user1",
      data: { categoryId: "cat1" },
    };

    const result = validateBatchOperationRequest(request);
    expect(result.valid).toBe(true);
  });

  it("should reject request with no transaction IDs", () => {
    const request: BatchOperationRequest = {
      type: "delete",
      transactionIds: [],
      userId: "user1",
    };

    const result = validateBatchOperationRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("No transaction IDs provided");
  });

  it("should reject request exceeding max transactions", () => {
    const tooManyIds = Array.from({ length: BATCH_OPERATION_LIMITS.maxTransactions + 1 }, (_, i) => `tx${i}`);

    const request: BatchOperationRequest = {
      type: "delete",
      transactionIds: tooManyIds,
      userId: "user1",
    };

    const result = validateBatchOperationRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Maximum 100 transactions");
  });

  it("should reject delete exceeding max delete per batch", () => {
    const tooManyIds = Array.from({ length: BATCH_OPERATION_LIMITS.maxDeletePerBatch + 1 }, (_, i) => `tx${i}`);

    const request: BatchOperationRequest = {
      type: "delete",
      transactionIds: tooManyIds,
      userId: "user1",
    };

    const result = validateBatchOperationRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Maximum 50 transactions");
  });

  it("should reject categorize without category ID", () => {
    const request: BatchOperationRequest = {
      type: "categorize",
      transactionIds: ["tx1", "tx2"],
      userId: "user1",
      data: {}, // Missing categoryId
    };

    const result = validateBatchOperationRequest(request);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Category ID is required for categorize operation");
  });

  it("should accept categorize with category ID", () => {
    const request: BatchOperationRequest = {
      type: "categorize",
      transactionIds: ["tx1", "tx2"],
      userId: "user1",
      data: { categoryId: "cat1" },
    };

    const result = validateBatchOperationRequest(request);
    expect(result.valid).toBe(true);
  });

  it("should accept non-categorize operations without category ID", () => {
    const request: BatchOperationRequest = {
      type: "mark_reconciled",
      transactionIds: ["tx1", "tx2"],
      userId: "user1",
    };

    const result = validateBatchOperationRequest(request);
    expect(result.valid).toBe(true);
  });
});

describe("executeBatchOperation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully categorize transactions", async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockRun = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }, { id: "tx2" }], { changes: 2 }));
    const mockAll = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }, { id: "tx2" }]));

    (mockDb.prepare as any).mockImplementation((query: string) => {
      if (query.includes("SELECT")) {
        return { bind: mockBind, all: mockAll };
      }
      return { bind: mockBind, run: mockRun };
    });

    const request: BatchOperationRequest = {
      type: "categorize",
      transactionIds: ["tx1", "tx2"],
      userId: "user1",
      data: { categoryId: "cat1" },
    };

    const result = await executeBatchOperation(mockDb, request);

    expect(result.success).toBe(true);
    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("should successfully delete transactions", async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockRun = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }], { changes: 1 }));
    const mockAll = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }]));

    (mockDb.prepare as any).mockImplementation((query: string) => {
      if (query.includes("SELECT")) {
        return { bind: mockBind, all: mockAll };
      }
      return { bind: mockBind, run: mockRun };
    });

    const request: BatchOperationRequest = {
      type: "delete",
      transactionIds: ["tx1"],
      userId: "user1",
    };

    const result = await executeBatchOperation(mockDb, request);

    expect(result.success).toBe(true);
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
  });

  it("should successfully mark transactions as reconciled", async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockRun = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }, { id: "tx2" }], { changes: 2 }));
    const mockAll = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }, { id: "tx2" }]));

    (mockDb.prepare as any).mockImplementation((query: string) => {
      if (query.includes("SELECT")) {
        return { bind: mockBind, all: mockAll };
      }
      return { bind: mockBind, run: mockRun };
    });

    const request: BatchOperationRequest = {
      type: "mark_reconciled",
      transactionIds: ["tx1", "tx2"],
      userId: "user1",
    };

    const result = await executeBatchOperation(mockDb, request);

    expect(result.success).toBe(true);
    expect(result.processed).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("should successfully mark transactions as posted", async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockRun = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }], { changes: 1 }));
    const mockAll = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }]));

    (mockDb.prepare as any).mockImplementation((query: string) => {
      if (query.includes("SELECT")) {
        return { bind: mockBind, all: mockAll };
      }
      return { bind: mockBind, run: mockRun };
    });

    const request: BatchOperationRequest = {
      type: "mark_posted",
      transactionIds: ["tx1"],
      userId: "user1",
    };

    const result = await executeBatchOperation(mockDb, request);

    expect(result.success).toBe(true);
    expect(result.processed).toBe(1);
  });

  it("should successfully mark transactions as pending", async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockRun = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }], { changes: 1 }));
    const mockAll = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }]));

    (mockDb.prepare as any).mockImplementation((query: string) => {
      if (query.includes("SELECT")) {
        return { bind: mockBind, all: mockAll };
      }
      return { bind: mockBind, run: mockRun };
    });

    const request: BatchOperationRequest = {
      type: "mark_pending",
      transactionIds: ["tx1"],
      userId: "user1",
    };

    const result = await executeBatchOperation(mockDb, request);

    expect(result.success).toBe(true);
    expect(result.processed).toBe(1);
  });

  it("should handle invalid transaction IDs", async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockAll = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }])); // Only tx1 is valid
    const mockRun = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }], { changes: 1 }));

    (mockDb.prepare as any).mockImplementation((query: string) => {
      if (query.includes("SELECT")) {
        return { bind: mockBind, all: mockAll };
      }
      return { bind: mockBind, run: mockRun };
    });

    const request: BatchOperationRequest = {
      type: "delete",
      transactionIds: ["tx1", "tx2", "tx3"], // tx2 and tx3 don't exist or belong to another user
      userId: "user1",
    };

    const result = await executeBatchOperation(mockDb, request);

    // Success is false because there are errors (tx2, tx3 failed ownership check)
    // even though tx1 was successfully processed
    expect(result.success).toBe(false);
    expect(result.processed).toBe(1);
    expect(result.failed).toBe(2); // tx2 and tx3 failed ownership check
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].error).toBe("Transaction not found or access denied");
  });

  it("should handle empty valid transaction list", async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockAll = vi.fn().mockResolvedValue(createMockResult([])); // No valid transactions

    (mockDb.prepare as any).mockReturnValue({
      bind: mockBind,
      all: mockAll,
    });

    const request: BatchOperationRequest = {
      type: "delete",
      transactionIds: ["tx1", "tx2"], // All invalid
      userId: "user1",
    };

    const result = await executeBatchOperation(mockDb, request);

    expect(result.success).toBe(false);
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.errors).toHaveLength(2);
  });

  it("should throw error for unknown operation type", async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockAll = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }]));

    (mockDb.prepare as any).mockReturnValue({
      bind: mockBind,
      all: mockAll,
    });

    const request: BatchOperationRequest = {
      type: "unknown" as BatchOperationType,
      transactionIds: ["tx1"],
      userId: "user1",
    };

    const result = await executeBatchOperation(mockDb, request);

    expect(result.success).toBe(false);
    expect(result.processed).toBe(0);
    // Failed = 1 (ownership check passed) + 0 (no other invalid) = 1
    // But when the operation fails, ALL valid IDs are added as errors
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0].error).toContain("Unknown batch operation type");
  });

  it("should handle database errors gracefully", async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockAll = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }]));
    const mockRun = vi.fn().mockRejectedValue(new Error("Database connection lost"));

    (mockDb.prepare as any).mockImplementation((query: string) => {
      if (query.includes("SELECT")) {
        return { bind: mockBind, all: mockAll };
      }
      return { bind: mockBind, run: mockRun };
    });

    const request: BatchOperationRequest = {
      type: "delete",
      transactionIds: ["tx1"],
      userId: "user1",
    };

    const result = await executeBatchOperation(mockDb, request);

    expect(result.success).toBe(false);
    expect(result.processed).toBe(0);
    // When DB operation fails, the valid ID is added to errors
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.errors.some(e => e.error === "Database connection lost")).toBe(true);
  });

  it("should update notes when provided", async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockRun = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }], { changes: 1 }));
    const mockAll = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }]));

    let updateCallCount = 0;
    (mockDb.prepare as any).mockImplementation((query: string) => {
      if (query.includes("SELECT")) {
        return { bind: mockBind, all: mockAll };
      }
      if (query.includes("notes")) {
        updateCallCount++;
      }
      return { bind: mockBind, run: mockRun };
    });

    const request: BatchOperationRequest = {
      type: "mark_reconciled",
      transactionIds: ["tx1"],
      userId: "user1",
      data: { notes: "Updated note" },
    };

    const result = await executeBatchOperation(mockDb, request);

    expect(result.success).toBe(true);
    expect(updateCallCount).toBeGreaterThan(0); // Notes update was called
  });

  it("should update tags when provided", async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockRun = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }], { changes: 1 }));
    const mockAll = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }]));

    let updateCallCount = 0;
    (mockDb.prepare as any).mockImplementation((query: string) => {
      if (query.includes("SELECT")) {
        return { bind: mockBind, all: mockAll };
      }
      if (query.includes("tags")) {
        updateCallCount++;
      }
      return { bind: mockBind, run: mockRun };
    });

    const request: BatchOperationRequest = {
      type: "mark_reconciled",
      transactionIds: ["tx1"],
      userId: "user1",
      data: { tags: "tag1,tag2" },
    };

    const result = await executeBatchOperation(mockDb, request);

    expect(result.success).toBe(true);
    expect(updateCallCount).toBeGreaterThan(0); // Tags update was called
  });
});

describe("previewBatchOperation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return preview of valid transactions", async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockAll = vi.fn().mockResolvedValue(
      createMockResult([
        { id: "tx1", date: "2025-01-15", description: "Coffee", amount: -5.50 },
        { id: "tx2", date: "2025-01-16", description: "Grocery", amount: -50.00 },
      ])
    );

    (mockDb.prepare as any).mockReturnValue({
      bind: mockBind,
      all: mockAll,
    });

    const result = await previewBatchOperation(mockDb, ["tx1", "tx2"], "user1");

    expect(result.valid).toBe(2);
    expect(result.invalid).toBe(0);
    expect(result.preview).toHaveLength(2);
    expect(result.preview[0]).toEqual({
      id: "tx1",
      date: "2025-01-15",
      description: "Coffee",
      amount: -5.50,
    });
  });

  it("should count invalid transactions", async () => {
    const mockBind = vi.fn().mockReturnThis();
    const mockAll = vi.fn().mockResolvedValue(createMockResult([{ id: "tx1" }])); // Only tx1 is valid

    (mockDb.prepare as any).mockReturnValue({
      bind: mockBind,
      all: mockAll,
    });

    const result = await previewBatchOperation(mockDb, ["tx1", "tx2", "tx3"], "user1");

    expect(result.valid).toBe(1);
    expect(result.invalid).toBe(2);
    expect(result.preview).toHaveLength(1);
  });

  it("should handle empty transaction list", async () => {
    const result = await previewBatchOperation(mockDb, [], "user1");

    expect(result.valid).toBe(0);
    expect(result.invalid).toBe(0);
    expect(result.preview).toHaveLength(0);
  });

  it("should order preview by date descending", async () => {
    const mockBind = vi.fn().mockReturnThis();
    // Mock returns results already sorted by date DESC (as SQL would do)
    const mockAll = vi.fn().mockResolvedValue(
      createMockResult([
        { id: "tx1", date: "2025-01-20", description: "Late transaction", amount: -10 },
        { id: "tx3", date: "2025-01-15", description: "Middle transaction", amount: -7.50 },
        { id: "tx2", date: "2025-01-10", description: "Early transaction", amount: -5 },
      ])
    );

    (mockDb.prepare as any).mockReturnValue({
      bind: mockBind,
      all: mockAll,
    });

    const result = await previewBatchOperation(mockDb, ["tx1", "tx2", "tx3"], "user1");

    expect(result.preview[0].description).toBe("Late transaction");
    expect(result.preview[1].description).toBe("Middle transaction");
    expect(result.preview[2].description).toBe("Early transaction");
  });
});

describe("BATCH_OPERATION_LIMITS", () => {
  it("should have defined limits", () => {
    expect(BATCH_OPERATION_LIMITS.maxTransactions).toBe(100);
    expect(BATCH_OPERATION_LIMITS.maxDeletePerBatch).toBe(50);
  });
});
