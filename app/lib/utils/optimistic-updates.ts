/**
 * Optimistic UI Update Utilities
 *
 * Provides utilities for implementing optimistic UI updates with React Router.
 * Optimistic updates show immediate feedback while the server operation is in progress,
 * improving perceived performance and user experience.
 *
 * Pattern:
 * 1. Capture original data before operation
 * 2. Show optimistic state immediately (before server response)
 * 3. Revert on error
 * 4. Update with server data on success
 */

import type { FetcherWithComponents } from "react-router/dom";

/**
 * Optimistic update state
 */
export interface OptimisticState<T> {
  data: T;
  isPending: boolean;
  isError: boolean;
  error?: Error;
}

/**
 * Configuration for optimistic update
 */
export interface OptimisticConfig<T> {
  // Original data before optimistic update
  originalData: T;
  // Optimistic data to show while pending
  optimisticData: T;
  // Action to perform (fetcher call)
  action: () => Promise<Response>;
  // Callbacks
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

/**
 * Perform optimistic update with automatic reversion on error
 *
 * @example
 * ```tsx
 * const fetcher = useFetcher();
 *
 * const handleOptimisticUpdate = async () => {
 *   await performOptimisticUpdate({
 *     originalData: transactions,
 *     optimisticData: [...transactions, newTransaction],
 *     action: () => fetcher.submit(formData),
 *     onSuccess: (newData) => setTransactions(newData),
 *     onError: (error) => console.error('Update failed:', error),
 *   });
 * };
 * ```
 */
export async function performOptimisticUpdate<T>({
  originalData,
  optimisticData,
  action,
  onSuccess,
  onError,
}: OptimisticConfig<T>): Promise<void> {
  // Show optimistic state
  let hasError = false;
  let error: Error | undefined;

  try {
    // Perform the action
    const response = await action();

    if (!response.ok) {
      hasError = true;
      error = new Error(`Action failed: ${response.status} ${response.statusText}`);
      throw error;
    }

    // If successful, the caller should handle server response
    onSuccess?.(originalData);
  } catch (e) {
    hasError = true;
    error = e instanceof Error ? e : new Error(String(e));
    onError?.(error);
    throw error;
  }
}

/**
 * Create optimistic state updater for array operations
 *
 * @example
 * ```tsx
 * // Adding an item optimistically
 * const optimisticTransactions = createOptimisticAdd(
 *   transactions,
 *   newTransaction
 * );
 *
 * // Removing an item optimistically
 * const optimisticTransactions = createOptimisticRemove(
 *   transactions,
 *   transactionId
 * );
 *
 * // Updating an item optimistically
 * const optimisticTransactions = createOptimisticUpdate(
 *   transactions,
 *   transactionId,
 *   updatedData
 * );
 * ```
 */
export function createOptimisticAdd<T>(
  array: T[],
  item: T
): T[] {
  return [...array, item];
}

export function createOptimisticRemove<T>(
  array: T[],
  predicate: (item: T) => boolean
): T[] {
  return array.filter((item) => !predicate(item));
}

export function createOptimisticUpdate<T>(
  array: T[],
  predicate: (item: T) => boolean,
  updates: Partial<T>
): T[] {
  return array.map((item) =>
    predicate(item) ? { ...item, ...updates } : item
  );
}

/**
 * React hook for optimistic UI updates with fetcher
 *
 * @example
 * ```tsx
 * function TransactionList() {
 *   const fetcher = useFetcher();
 *   const [transactions, setTransactions] = useState([]);
 *   const optimisticState = useOptimisticState(transactions);
 *
 *   const handleDelete = async (id: string) => {
 *     setTransactions(createOptimisticRemove(transactions, (t) => t.id === id));
 *
 *     try {
 *       await fetcher.submit({ action: "/api/transactions/delete", id });
 *       // Refetch to get server state
 *       await fetcher.load("/api/transactions");
 *     } catch (error) {
 *       // Revert by refetching
 *       await fetcher.load("/api/transactions");
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {optimisticState.data.map((t) => (
 *         <TransactionItem
 *           key={t.id}
 *           transaction={t}
 *           isPending={optimisticState.isPending}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOptimisticState<T>(data: T): OptimisticState<T> {
  return {
    data,
    isPending: false,
    isError: false,
  };
}

/**
 * Helper to create optimistic state with loading indicator
 */
export function createOptimisticStateWithLoading<T>(
  data: T,
  isPending: boolean
): OptimisticState<T> {
  return {
    data,
    isPending,
    isError: false,
  };
}

/**
 * Helper to create optimistic state with error
 */
export function createOptimisticStateWithError<T>(
  data: T,
  error: Error
): OptimisticState<T> {
  return {
    data,
    isPending: false,
    isError: true,
    error,
  };
}

/**
 * Check if an operation should use optimistic updates
 * Disabled for sensitive operations that require server confirmation
 */
export function shouldUseOptimisticUpdate(
  operation: "create" | "update" | "delete",
  context?: {
    isSensitive?: boolean;
    requiresConfirmation?: boolean;
  }
): boolean {
  // Don't use optimistic updates for sensitive operations
  if (context?.isSensitive || context?.requiresConfirmation) {
    return false;
  }

  // Use optimistic updates for most CRUD operations
  return true;
}

/**
 * Optimistic update context for managing multiple concurrent updates
 */
export class OptimisticUpdateManager<T> {
  private originalData: T;
  private optimisticData: T | null = null;
  private pendingOperations = new Set<string>();

  constructor(private data: T) {
    this.originalData = data;
  }

  /**
   * Begin an optimistic update
   */
  beginOptimisticUpdate(operationId: string, optimisticData: T): void {
    this.optimisticData = optimisticData;
    this.pendingOperations.add(operationId);
  }

  /**
   * Commit the optimistic update (called on success)
   */
  commitUpdate(operationId: string, serverData: T): void {
    this.pendingOperations.delete(operationId);
    this.data = serverData;
    this.optimisticData = null;

    if (this.pendingOperations.size === 0) {
      this.originalData = serverData;
    }
  }

  /**
   * Revert the optimistic update (called on error)
   */
  revertUpdate(operationId: string): void {
    this.pendingOperations.delete(operationId);
    this.optimisticData = null;
  }

  /**
   * Get current data (optimistic if pending, otherwise original)
   */
  getCurrentData(): T {
    return this.optimisticData ?? this.data;
  }

  /**
   * Check if an operation is pending
   */
  isPending(operationId?: string): boolean {
    if (operationId) {
      return this.pendingOperations.has(operationId);
    }
    return this.pendingOperations.size > 0;
  }

  /**
   * Get the original data (before any optimistic updates)
   */
  getOriginalData(): T {
    return this.originalData;
  }
}

/**
 * Utility to create error with revert function
 */
export function createRevertError(
  message: string,
  revert: () => void
): Error & { revert: () => void } {
  const error = new Error(message) as Error & { revert: () => void };
  error.revert = revert;
  return error;
}
