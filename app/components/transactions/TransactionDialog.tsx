import { lazy, Suspense } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import type { TransactionFilterOptions, TransactionWithRelations } from "~/lib/db/transactions.server";
import { createTransactionSchema } from "~/lib/validations/transaction";
import type { z } from "zod";

// Lazy load TransactionForm to reduce initial dialog bundle size
const TransactionForm = lazy(() =>
  import("./TransactionForm").then(m => ({ default: m.TransactionForm }))
);

/**
 * Transaction dialog props
 */
interface TransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: TransactionWithRelations;
  filterOptions: TransactionFilterOptions;
  isSubmitting?: boolean;
  onSubmit: (data: z.infer<typeof createTransactionSchema>) => void;
}

/**
 * Transaction dialog component
 * Modal wrapper for transaction form
 */
export function TransactionDialog({
  isOpen,
  onClose,
  transaction,
  filterOptions,
  isSubmitting = false,
  onSubmit,
}: TransactionDialogProps) {
  const isEdit = !!transaction;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Transaction" : "Add New Transaction"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the transaction details below."
              : "Fill in the details to create a new transaction."}
          </DialogDescription>
        </DialogHeader>

        <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded" />}>
          <TransactionForm
            transaction={transaction}
            filterOptions={filterOptions}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
            onCancel={onClose}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
