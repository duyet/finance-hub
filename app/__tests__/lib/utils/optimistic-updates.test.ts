/**
 * Unit Tests: Optimistic UI Update Utilities
 *
 * Tests the optimistic update pattern for immediate UI feedback.
 * Covers: array operations, error reversion, concurrent updates
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createOptimisticAdd,
  createOptimisticRemove,
  createOptimisticUpdate,
  performOptimisticUpdate,
  shouldUseOptimisticUpdate,
  OptimisticUpdateManager,
  createOptimisticStateWithLoading,
  createOptimisticStateWithError,
  type OptimisticConfig,
} from "~/lib/utils/optimistic-updates";

describe("createOptimisticAdd", () => {
  it("should add item to end of array", () => {
    const array = [1, 2, 3];
    const result = createOptimisticAdd(array, 4);

    expect(result).toEqual([1, 2, 3, 4]);
    expect(result).not.toBe(array); // Immutable
  });

  it("should add object to array", () => {
    const transactions = [
      { id: "1", amount: 100 },
      { id: "2", amount: 200 },
    ];
    const newTransaction = { id: "3", amount: 300 };
    const result = createOptimisticAdd(transactions, newTransaction);

    expect(result).toHaveLength(3);
    expect(result[2]).toEqual(newTransaction);
  });

  it("should add item to empty array", () => {
    const result = createOptimisticAdd([], "first");
    expect(result).toEqual(["first"]);
  });
});

describe("createOptimisticRemove", () => {
  it("should remove item matching predicate", () => {
    const array = [1, 2, 3, 4, 5];
    const result = createOptimisticRemove(array, (item) => item === 3);

    expect(result).toEqual([1, 2, 4, 5]);
    expect(result).not.toBe(array);
  });

  it("should remove multiple items matching predicate", () => {
    const array = [1, 2, 3, 2, 4];
    const result = createOptimisticRemove(array, (item) => item === 2);

    expect(result).toEqual([1, 3, 4]);
  });

  it("should remove object by id", () => {
    const transactions = [
      { id: "1", amount: 100 },
      { id: "2", amount: 200 },
      { id: "3", amount: 300 },
    ];
    const result = createOptimisticRemove(transactions, (t) => t.id === "2");

    expect(result).toHaveLength(2);
    expect(result.find((t) => t.id === "2")).toBeUndefined();
  });

  it("should return unchanged array if no match", () => {
    const array = [1, 2, 3];
    const result = createOptimisticRemove(array, (item) => item === 99);

    expect(result).toEqual(array);
    expect(result).not.toBe(array); // Still creates new array
  });
});

describe("createOptimisticUpdate", () => {
  it("should update item matching predicate", () => {
    const array = [
      { id: "1", name: "Item 1" },
      { id: "2", name: "Item 2" },
      { id: "3", name: "Item 3" },
    ];
    const result = createOptimisticUpdate(
      array,
      (item) => item.id === "2",
      { name: "Updated Item 2" }
    );

    expect(result[1]).toEqual({ id: "2", name: "Updated Item 2" });
    expect(result[0]).toEqual({ id: "1", name: "Item 1" });
    expect(result[2]).toEqual({ id: "3", name: "Item 3" });
  });

  it("should update multiple matching items", () => {
    const array = [
      { status: "pending", id: "1" },
      { status: "pending", id: "2" },
      { status: "complete", id: "3" },
    ];
    const result = createOptimisticUpdate(
      array,
      (item) => item.status === "pending",
      { status: "processing" }
    );

    expect(result[0]).toEqual({ status: "processing", id: "1" });
    expect(result[1]).toEqual({ status: "processing", id: "2" });
    expect(result[2]).toEqual({ status: "complete", id: "3" });
  });

  it("should not update items not matching predicate", () => {
    const array = [
      { id: "1", amount: 100 },
      { id: "2", amount: 200 },
    ];
    const result = createOptimisticUpdate(
      array,
      (item) => item.id === "99",
      { amount: 999 }
    );

    expect(result).toEqual(array);
  });
});

describe("performOptimisticUpdate", () => {
  it("should call onSuccess when action succeeds", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const action = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    } as Response);

    const config: OptimisticConfig<number[]> = {
      originalData: [1, 2, 3],
      optimisticData: [1, 2, 3, 4],
      action,
      onSuccess,
      onError,
    };

    await performOptimisticUpdate(config);

    expect(action).toHaveBeenCalledOnce();
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onError).not.toHaveBeenCalled();
  });

  it("should call onError when action fails", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const action = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as Response);

    const config: OptimisticConfig<number[]> = {
      originalData: [1, 2, 3],
      optimisticData: [1, 2, 3, 4],
      action,
      onSuccess,
      onError,
    };

    await expect(performOptimisticUpdate(config)).rejects.toThrow();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("should call onError when action throws", async () => {
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const error = new Error("Network error");
    const action = vi.fn().mockRejectedValue(error);

    const config: OptimisticConfig<number[]> = {
      originalData: [1, 2, 3],
      optimisticData: [1, 2, 3, 4],
      action,
      onSuccess,
      onError,
    };

    await expect(performOptimisticUpdate(config)).rejects.toThrow("Network error");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(error);
  });

  it("should work without callbacks", async () => {
    const action = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
    } as Response);

    const config: OptimisticConfig<number[]> = {
      originalData: [1, 2, 3],
      optimisticData: [1, 2, 3, 4],
      action,
    };

    // Should complete without throwing
    await performOptimisticUpdate(config);
    expect(action).toHaveBeenCalledOnce();
  });
});

describe("shouldUseOptimisticUpdate", () => {
  it("should return true for normal operations", () => {
    expect(shouldUseOptimisticUpdate("create")).toBe(true);
    expect(shouldUseOptimisticUpdate("update")).toBe(true);
    expect(shouldUseOptimisticUpdate("delete")).toBe(true);
  });

  it("should return false for sensitive operations", () => {
    expect(
      shouldUseOptimisticUpdate("create", { isSensitive: true })
    ).toBe(false);
    expect(
      shouldUseOptimisticUpdate("delete", { requiresConfirmation: true })
    ).toBe(false);
  });

  it("should return false for sensitive financial operations", () => {
    expect(
      shouldUseOptimisticUpdate("delete", {
        isSensitive: true,
        requiresConfirmation: true,
      })
    ).toBe(false);
  });
});

describe("OptimisticUpdateManager", () => {
  let manager: OptimisticUpdateManager<number[]>;

  beforeEach(() => {
    manager = new OptimisticUpdateManager([1, 2, 3]);
  });

  it("should return original data initially", () => {
    expect(manager.getCurrentData()).toEqual([1, 2, 3]);
    expect(manager.getOriginalData()).toEqual([1, 2, 3]);
  });

  it("should begin optimistic update", () => {
    manager.beginOptimisticUpdate("op1", [1, 2, 3, 4]);

    expect(manager.getCurrentData()).toEqual([1, 2, 3, 4]);
    expect(manager.isPending("op1")).toBe(true);
    expect(manager.isPending()).toBe(true);
  });

  it("should commit optimistic update", () => {
    manager.beginOptimisticUpdate("op1", [1, 2, 3, 4]);
    manager.commitUpdate("op1", [1, 2, 3, 4, 5]);

    expect(manager.getCurrentData()).toEqual([1, 2, 3, 4, 5]);
    expect(manager.isPending("op1")).toBe(false);
    expect(manager.isPending()).toBe(false);
  });

  it("should revert optimistic update", () => {
    const originalData = [1, 2, 3];
    manager.beginOptimisticUpdate("op1", [1, 2, 3, 4]);
    manager.revertUpdate("op1");

    expect(manager.getCurrentData()).toEqual(originalData);
    expect(manager.isPending("op1")).toBe(false);
  });

  it("should handle multiple concurrent operations", () => {
    manager.beginOptimisticUpdate("op1", [1, 2, 3, 4]);
    manager.beginOptimisticUpdate("op2", [1, 2, 3, 4, 5]);

    expect(manager.isPending("op1")).toBe(true);
    expect(manager.isPending("op2")).toBe(true);
    expect(manager.isPending()).toBe(true);

    manager.commitUpdate("op1", [1, 2, 3, 4]);
    expect(manager.isPending("op1")).toBe(false);
    expect(manager.isPending("op2")).toBe(true);
    expect(manager.isPending()).toBe(true);
  });

  it("should update original data when all operations complete", () => {
    manager.beginOptimisticUpdate("op1", [1, 2, 3, 4]);
    const serverData = [1, 2, 3, 4, 5];
    manager.commitUpdate("op1", serverData);

    expect(manager.getOriginalData()).toEqual(serverData);
  });

  it("should preserve original data during concurrent operations", () => {
    const originalData = [1, 2, 3];
    manager.beginOptimisticUpdate("op1", [1, 2, 3, 4]);
    manager.beginOptimisticUpdate("op2", [1, 2, 3, 4, 5]);
    manager.commitUpdate("op1", [1, 2, 3, 4]);

    expect(manager.getOriginalData()).toEqual(originalData);
    expect(manager.isPending()).toBe(true);
  });

  it("should update original data only when last operation completes", () => {
    manager.beginOptimisticUpdate("op1", [1, 2, 3, 4]);
    manager.beginOptimisticUpdate("op2", [1, 2, 3, 4, 5]);
    const finalServerData = [1, 2, 3, 4, 5, 6];

    manager.commitUpdate("op1", [1, 2, 3, 4]);
    expect(manager.getOriginalData()).toEqual([1, 2, 3]);

    manager.commitUpdate("op2", finalServerData);
    expect(manager.getOriginalData()).toEqual(finalServerData);
  });
});

describe("State Helpers", () => {
  it("should create state with loading indicator", () => {
    const state = createOptimisticStateWithLoading([1, 2, 3], true);

    expect(state.data).toEqual([1, 2, 3]);
    expect(state.isPending).toBe(true);
    expect(state.isError).toBe(false);
    expect(state.error).toBeUndefined();
  });

  it("should create state with error", () => {
    const error = new Error("Operation failed");
    const state = createOptimisticStateWithError([1, 2, 3], error);

    expect(state.data).toEqual([1, 2, 3]);
    expect(state.isPending).toBe(false);
    expect(state.isError).toBe(true);
    expect(state.error).toEqual(error);
  });

  it("should create state without loading", () => {
    const state = createOptimisticStateWithLoading([1, 2, 3], false);

    expect(state.data).toEqual([1, 2, 3]);
    expect(state.isPending).toBe(false);
    expect(state.isError).toBe(false);
  });
});

describe("Optimistic Update Integration Patterns", () => {
  it("should handle typical transaction creation flow", async () => {
    const transactions = [
      { id: "1", amount: 100 },
      { id: "2", amount: 200 },
    ];
    const newTransaction = { id: "3", amount: 300 };

    // Optimistic state
    const optimisticTransactions = createOptimisticAdd(
      transactions,
      newTransaction
    );
    expect(optimisticTransactions).toHaveLength(3);

    // Simulate server success
    const serverTransactions = createOptimisticAdd(transactions, {
      id: "server-3",
      amount: 300,
    });
    expect(serverTransactions).toHaveLength(3);

    // Simulate server error - revert to original
    const revertedTransactions = transactions;
    expect(revertedTransactions).toHaveLength(2);
  });

  it("should handle typical transaction deletion flow", async () => {
    const transactions = [
      { id: "1", amount: 100 },
      { id: "2", amount: 200 },
      { id: "3", amount: 300 },
    ];

    // Optimistic state
    const optimisticTransactions = createOptimisticRemove(
      transactions,
      (t) => t.id === "2"
    );
    expect(optimisticTransactions).toHaveLength(2);
    expect(optimisticTransactions.find((t) => t.id === "2")).toBeUndefined();

    // On error, revert to original
    const revertedTransactions = transactions;
    expect(revertedTransactions).toHaveLength(3);
  });

  it("should handle typical transaction update flow", async () => {
    const transactions = [
      { id: "1", amount: 100, status: "pending" },
      { id: "2", amount: 200, status: "pending" },
    ];

    // Optimistic state
    const optimisticTransactions = createOptimisticUpdate(
      transactions,
      (t) => t.id === "1",
      { status: "verified" }
    );
    expect(optimisticTransactions[0]).toEqual({
      id: "1",
      amount: 100,
      status: "verified",
    });
    expect(optimisticTransactions[1]).toEqual({
      id: "2",
      amount: 200,
      status: "pending",
    });

    // On error, original is preserved
    expect(transactions[0]).toEqual({
      id: "1",
      amount: 100,
      status: "pending",
    });
  });
});
