/**
 * Batch Operations Toolbar
 *
 * Provides UI for selecting transactions and performing batch actions.
 * Shows selection count, available actions, and confirmation dialogs.
 */

import { useState, useCallback } from "react";
import { useFetcher } from "react-router";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { AlertCircle, CheckCircle, LoaderCircle } from "lucide-react";
import type { BatchOperationType } from "~/lib/services/batch-operations.server";

interface BatchOperationsToolbarProps {
  selectedIds: string[];
  totalCount: number;
  onClear: () => void;
  disabled?: boolean;
  availableCategories?: Array<{ id: string; name: string }>;
}

interface BatchOperation {
  type: BatchOperationType;
  label: string;
  description: string;
  destructive: boolean;
  requiresConfirmation: boolean;
  icon: React.ReactNode;
}

const OPERATIONS: BatchOperation[] = [
  {
    type: "categorize",
    label: "Categorize",
    description: "Assign a category to selected transactions",
    destructive: false,
    requiresConfirmation: false,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586 3.414l-5 5c-.39.39-.586.902-.586 1.414v6c0 .512.195 1.024.586 1.414 3.414l5 5c.39.39.902.586 1.414.586h6" />
      </svg>
    ),
  },
  {
    type: "mark_reconciled",
    label: "Mark Reconciled",
    description: "Mark selected transactions as reconciled",
    destructive: false,
    requiresConfirmation: false,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
        <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" />
      </svg>
    ),
  },
  {
    type: "mark_posted",
    label: "Mark Posted",
    description: "Mark selected transactions as posted",
    destructive: false,
    requiresConfirmation: false,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
        <line x1="9" x2="15" y1="9" y2="15" />
        <line x1="15" x2="9" y1="9" y2="15" />
      </svg>
    ),
  },
  {
    type: "delete",
    label: "Delete",
    description: "Permanently delete selected transactions",
    destructive: true,
    requiresConfirmation: true,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    ),
  },
];

export function BatchOperationsToolbar({
  selectedIds,
  totalCount,
  onClear,
  disabled = false,
  availableCategories = [],
}: BatchOperationsToolbarProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    operation: BatchOperation;
    categoryId?: string;
  } | null>(null);

  const fetcher = useFetcher();
  const isPending = fetcher.state === "submitting";

  const handleOperation = useCallback(
    (operation: BatchOperation, categoryId?: string) => {
      if (operation.requiresConfirmation) {
        setConfirmDialog({ operation, categoryId });
      } else {
        executeOperation(operation, categoryId);
      }
    },
    [selectedIds]
  );

  const executeOperation = useCallback(
    (operation: BatchOperation, categoryId?: string) => {
      const formData = new FormData();
      formData.append("type", operation.type);
      selectedIds.forEach((id) => formData.append("transactionIds", id));
      if (categoryId) {
        formData.append("categoryId", categoryId);
      }

      fetcher.submit(formData, {
        method: "POST",
        action: "/api/batch-transactions",
      });
    },
    [selectedIds, fetcher]
  );

  const handleConfirm = () => {
    if (confirmDialog) {
      executeOperation(confirmDialog.operation, confirmDialog.categoryId);
      setConfirmDialog(null);
    }
  };

  if (selectedIds.length === 0) {
    return null;
  }

  return (
    <>
      {/* Batch Operations Bar */}
      <div className="flex items-center justify-between rounded-lg border bg-blue-50 px-4 py-2 dark:bg-blue-950 dark:border-blue-900">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedIds.length} selected
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            of {totalCount}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={disabled || isPending}
          >
            Clear
          </Button>

          {OPERATIONS.map((operation) => (
            <Button
              key={operation.type}
              variant={operation.destructive ? "destructive" : "outline"}
              size="sm"
              onClick={() => handleOperation(operation)}
              disabled={disabled || isPending}
            >
              {operation.icon}
              <span className="ml-1">{operation.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <Dialog open={true} onOpenChange={() => setConfirmDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {confirmDialog.operation.destructive ? (
                  <AlertCircle className="h-5 w-5 text-destructive" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
                {confirmDialog.operation.label} Transactions
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to {confirmDialog.operation.label.toLowerCase()}{" "}
                {selectedIds.length} transaction{selectedIds.length > 1 ? "s" : ""}?
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {confirmDialog.operation.destructive
                  ? "This action cannot be undone. The transactions will be permanently deleted."
                  : confirmDialog.operation.description}
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmDialog(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant={confirmDialog.operation.destructive ? "destructive" : "default"}
                onClick={handleConfirm}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {confirmDialog.operation.destructive ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    ) : (
                      <CheckCircle className="mr-1 h-4 w-4" />
                    )}
                    {confirmDialog.operation.label}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/**
 * Checkbox for batch selection
 */
export function TransactionCheckbox({
  id,
  isSelected,
  onToggle,
  disabled = false,
}: {
  id: string;
  isSelected: boolean;
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      checked={isSelected}
      onChange={() => onToggle(id)}
      disabled={disabled}
      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}

/**
 * Select All checkbox
 */
export function SelectAllCheckbox({
  allSelected,
  partiallySelected,
  onToggle,
  disabled = false,
}: {
  allSelected: boolean;
  partiallySelected: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      checked={allSelected}
      ref={(input) => {
        if (input) {
          input.indeterminate = partiallySelected;
        }
      }}
      onChange={onToggle}
      disabled={disabled}
      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
