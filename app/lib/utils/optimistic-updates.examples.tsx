/**
 * Optimistic UI Updates - Integration Examples
 *
 * This file contains practical examples demonstrating how to use the
 * optimistic update utilities in real React Router v7 routes.
 *
 * These examples show the complete pattern:
 * 1. Capture original data
 * 2. Show optimistic state immediately
 * 3. Call server action
 * 4. Revert on error
 * 5. Update with server data on success
 */

import { useState, useCallback } from "react";
import { useFetcher, useNavigation } from "react-router";
import type { FetcherWithComponents } from "react-router/dom";
import {
  createOptimisticAdd,
  createOptimisticRemove,
  createOptimisticUpdate,
  performOptimisticUpdate,
  shouldUseOptimisticUpdate,
  type OptimisticConfig,
} from "./optimistic-updates";

/**
 * Example 1: Transaction List with Optimistic Delete
 *
 * Shows how to implement optimistic deletion with immediate UI feedback
 */
export function useTransactionDelete(transactions: Transaction[]) {
  const fetcher = useFetcher();
  const [optimisticTransactions, setOptimisticTransactions] = useState(transactions);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());

  const handleDelete = useCallback(async (id: string) => {
    // Check if this operation should use optimistic updates
    if (!shouldUseOptimisticUpdate("delete")) {
      // For sensitive operations, skip optimistic update
      fetcher.submit({ action: "/api/transactions/delete", id }, { method: "POST" });
      return;
    }

    // 1. Store original data for potential revert
    const originalTransactions = optimisticTransactions;

    // 2. Show optimistic state immediately
    const optimisticData = createOptimisticRemove(
      optimisticTransactions,
      (t) => t.id === id
    );
    setOptimisticTransactions(optimisticData);
    setPendingDeletes((prev) => new Set(prev).add(id));

    try {
      // 3. Perform server action
      const response = await fetcher.submit(
        { action: "/api/transactions/delete", id },
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status}`);
      }

      // 4. On success, optimistic data is already shown
      // Optionally refetch to get server state
      // fetcher.load("/api/transactions");
    } catch (error) {
      // 5. Revert on error
      setOptimisticTransactions(originalTransactions);
      console.error("Delete failed, reverted:", error);
    } finally {
      setPendingDeletes((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [optimisticTransactions, fetcher]);

  return {
    transactions: optimisticTransactions,
    handleDelete,
    isDeleting: (id: string) => pendingDeletes.has(id),
  };
}

/**
 * Example 2: Transaction Creation with Optimistic Add
 *
 * Shows how to implement optimistic creation with loading state
 */
export function useTransactionCreate() {
  const fetcher = useFetcher();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTransaction = useCallback(async (
    transactions: Transaction[],
    newTransaction: Omit<Transaction, "id">
  ) => {
    // Generate temporary ID for optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticTransaction: Transaction = {
      ...newTransaction,
      id: tempId,
      createdAt: new Date().toISOString(),
    };

    // 1. Show optimistic state
    setIsPending(true);
    setError(null);

    try {
      // 2. Perform server action
      const response = await fetcher.submit(
        {
          action: "/api/transactions/create",
          transaction: optimisticTransaction,
        },
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error(`Create failed: ${response.status}`);
      }

      // 3. On success, refetch to get server-generated ID
      // fetcher.load("/api/transactions");
      return optimisticTransaction;
    } catch (err) {
      // 4. Error handling - let caller handle revert
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      setIsPending(false);
    }
  }, [fetcher]);

  return { createTransaction, isPending, error };
}

/**
 * Example 3: Inline Transaction Edit with Optimistic Update
 *
 * Shows how to implement optimistic inline editing
 */
export function useTransactionEdit(transactions: Transaction[]) {
  const fetcher = useFetcher();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [optimisticTransactions, setOptimisticTransactions] = useState(transactions);

  const handleEdit = useCallback(async (id: string, updates: Partial<Transaction>) => {
    // 1. Store original data
    const originalTransactions = optimisticTransactions;

    // 2. Show optimistic state immediately
    const optimisticData = createOptimisticUpdate(
      optimisticTransactions,
      (t) => t.id === id,
      updates
    );
    setOptimisticTransactions(optimisticData);
    setEditingId(id);

    try {
      // 3. Perform server action
      const response = await fetcher.submit(
        {
          action: "/api/transactions/update",
          id,
          updates,
        },
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }

      // 4. On success, optimistic data is already shown
    } catch (error) {
      // 5. Revert on error
      setOptimisticTransactions(originalTransactions);
      console.error("Update failed, reverted:", error);
    } finally {
      setEditingId(null);
    }
  }, [optimisticTransactions, fetcher]);

  return {
    transactions: optimisticTransactions,
    handleEdit,
    editingId,
  };
}

/**
 * Example 4: Receipt Upload with Optimistic Progress
 *
 * Shows how to combine optimistic UI with upload progress
 */
export function useReceiptUpload() {
  const fetcher = useFetcher();
  const [uploadingReceipts, setUploadingReceipts] = useState<Set<string>>(new Set());

  const uploadReceipt = useCallback(async (
    file: File,
    transactionId: string
  ) => {
    // 1. Show optimistic uploading state
    setUploadingReceipts((prev) => new Set(prev).add(transactionId));

    try {
      // 2. Perform server upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("transactionId", transactionId);

      const response = await fetcher.submit(formData, {
        method: "POST",
        action: "/api/receipts/upload",
        encType: "multipart/form-data",
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // 3. Error handling
      console.error("Upload failed:", error);
      throw error;
    } finally {
      setUploadingReceipts((prev) => {
        const next = new Set(prev);
        next.delete(transactionId);
        return next;
      });
    }
  }, [fetcher]);

  return { uploadReceipt, isUploading: (id: string) => uploadingReceipts.has(id) };
}

/**
 * Example 5: Bulk Operations with Optimistic Updates
 *
 * Shows how to handle multiple optimistic updates at once
 */
export function useBulkTransactionActions() {
  const fetcher = useFetcher();
  const [pendingOperations, setPendingOperations] = useState<Set<string>>(new Set());

  const bulkCategorize = useCallback(async (
    transactions: Transaction[],
    categoryIds: { transactionId: string; categoryId: string }[]
  ) => {
    // 1. Generate operation ID
    const operationId = `bulk-${Date.now()}`;
    setPendingOperations((prev) => new Set(prev).add(operationId));

    // 2. Show optimistic state for all affected transactions
    const optimisticData = transactions.map((t) => {
      const update = categoryIds.find((c) => c.transactionId === t.id);
      return update
        ? { ...t, categoryId: update.categoryId }
        : t;
    });

    try {
      // 3. Perform server action
      const response = await fetcher.submit(
        {
          action: "/api/transactions/bulk-categorize",
          updates: categoryIds,
        },
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error(`Bulk update failed: ${response.status}`);
      }

      return optimisticData;
    } catch (error) {
      // 4. On error, caller should handle revert by refetching
      console.error("Bulk operation failed:", error);
      throw error;
    } finally {
      setPendingOperations((prev) => {
        const next = new Set(prev);
        next.delete(operationId);
        return next;
      });
    }
  }, [fetcher]);

  return { bulkCategorize, isPending: pendingOperations.size > 0 };
}

/**
 * Example 6: Optimistic Toggle (Boolean State)
 *
 * Shows a simple optimistic pattern for toggle switches
 */
export function useTransactionToggle(transactions: Transaction[]) {
  const fetcher = useFetcher();

  const toggleFlag = useCallback(async (
    id: string,
    flag: keyof Pick<Transaction, "isVerified" | "isReconciled">
  ) => {
    // 1. Find current state
    const transaction = transactions.find((t) => t.id === id);
    if (!transaction) return;

    const originalValue = transaction[flag];
    const optimisticValue = !originalValue;

    // 2. Optimistically update UI (caller handles this)
    const optimisticData = createOptimisticUpdate(
      transactions,
      (t) => t.id === id,
      { [flag]: optimisticValue }
    );

    try {
      // 3. Perform server action
      const response = await fetcher.submit(
        {
          action: "/api/transactions/toggle",
          id,
          flag,
          value: optimisticValue,
        },
        { method: "POST" }
      );

      if (!response.ok) {
        throw new Error(`Toggle failed: ${response.status}`);
      }

      return optimisticData;
    } catch (error) {
      // 4. Return original data for revert
      console.error("Toggle failed:", error);
      return transactions; // Original data
    }
  }, [transactions, fetcher]);

  return { toggleFlag };
}

/**
 * Example 7: Using performOptimisticUpdate Helper
 *
 * Shows the cleaner pattern using the helper function
 */
export function useOptimisticTransactionAction() {
  const fetcher = useFetcher();

  const deleteTransaction = useCallback(async (
    transactions: Transaction[],
    id: string
  ) => {
    const config: OptimisticConfig<Transaction[]> = {
      originalData: transactions,
      optimisticData: createOptimisticRemove(transactions, (t) => t.id === id),
      action: () => fetcher.submit(
        { action: "/api/transactions/delete", id },
        { method: "POST" }
      ),
      onSuccess: (data) => {
        console.log("Delete successful:", data);
      },
      onError: (error) => {
        console.error("Delete failed, reverting:", error);
      },
    };

    await performOptimisticUpdate(config);
  }, [fetcher]);

  return { deleteTransaction };
}

/**
 * Example 8: Component-Level Usage
 *
 * Shows how to use these hooks in a component
 */
export function TransactionListExample() {
  const { data } = useLoaderData<{ transactions: Transaction[] }>();
  const { transactions, handleDelete, isDeleting } = useTransactionDelete(data.transactions);
  const { handleEdit, editingId } = useTransactionEdit(transactions);

  return (
    <div className="transaction-list">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="transaction-item">
          <h3>{transaction.description}</h3>
          <p>{transaction.amount}</p>

          {/* Delete button with optimistic feedback */}
          <button
            onClick={() => handleDelete(transaction.id)}
            disabled={isDeleting(transaction.id)}
            className="delete-btn"
          >
            {isDeleting(transaction.id) ? "Deleting..." : "Delete"}
          </button>

          {/* Edit with optimistic feedback */}
          <button
            onClick={() => handleEdit(transaction.id, { description: "Updated" })}
            disabled={editingId === transaction.id}
            className="edit-btn"
          >
            {editingId === transaction.id ? "Saving..." : "Edit"}
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Example 9: Form Submission with Optimistic Updates
 *
 * Shows how to combine form submission with optimistic UI
 */
export function TransactionFormExample() {
  const fetcher = useFetcher();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    // For forms, React Router automatically handles navigation
    // Add optimistic UI before submission
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      <input name="description" type="text" placeholder="Description" />
      <input name="amount" type="number" placeholder="Amount" />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add Transaction"}
      </button>
    </form>
  );
}

/**
 * Example 10: Error Boundary Integration
 *
 * Shows how to combine optimistic updates with error boundaries
 */
export function TransactionListWithErrorBoundary() {
  const { transactions, handleDelete, isDeleting } = useTransactionDelete([]);

  return (
    <div className="transaction-list">
      {transactions.map((transaction) => (
        <div key={transaction.id} className="transaction-item">
          {/* ... transaction content ... */}

          <button
            onClick={() => {
              // Optimistic delete with error handling
              handleDelete(transaction.id).catch((error) => {
                // Error is already handled by the hook
                // Optionally show toast notification
                console.error("Delete failed:", error);
              });
            }}
            disabled={isDeleting(transaction.id)}
          >
            {isDeleting(transaction.id) ? "Deleting..." : "Delete"}
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * Types for the examples
 */
interface Transaction {
  id: string;
  description: string;
  amount: number;
  categoryId?: string;
  isVerified: boolean;
  isReconciled: boolean;
  createdAt: string;
}

/**
 * Usage Guidelines:
 *
 * 1. ALWAYS check shouldUseOptimisticUpdate() for sensitive operations
 * 2. ALWAYS store original data before optimistic updates
 * 3. ALWAYS implement error reversion
 * 4. ALWAYS provide visual feedback during pending operations
 * 5. Consider using OptimisticUpdateManager for complex scenarios with concurrent updates
 * 6. Test error scenarios thoroughly
 */
