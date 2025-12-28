import { Fragment } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { TransactionForm } from "./TransactionForm";
import type { TransactionFilterOptions, TransactionWithRelations } from "~/lib/db/transactions.server";

/**
 * Transaction dialog props
 */
interface TransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transaction?: TransactionWithRelations;
  filterOptions: TransactionFilterOptions;
  isSubmitting?: boolean;
  onSubmit: (data: any) => void;
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

        <TransactionForm
          transaction={transaction}
          filterOptions={filterOptions}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
