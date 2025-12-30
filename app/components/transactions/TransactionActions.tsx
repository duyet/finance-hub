import { Link } from "react-router";
import { MoreHorizontal } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "~/components/ui/dropdown-menu";

/**
 * Transaction actions props
 */
interface TransactionActionsProps {
  transactionId: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onViewReceipt?: (id: string) => void;
  receiptUrl?: string | null;
  isDisabled?: boolean;
}

/**
 * Status badge component for transaction status
 */
interface StatusBadgeProps {
  status: "PENDING" | "POSTED" | "CLEARED" | "RECONCILED";
  className?: string;
}

const statusConfig = {
  PENDING: {
    label: "Pending",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  POSTED: {
    label: "Posted",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  CLEARED: {
    label: "Cleared",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  RECONCILED: {
    label: "Reconciled",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${config.className} ${className || ""}`}
    >
      {config.label}
    </span>
  );
}

/**
 * Transaction row actions dropdown menu
 */
export function TransactionActions({
  transactionId,
  onEdit,
  onDelete,
  onViewReceipt,
  receiptUrl,
  isDisabled = false,
}: TransactionActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={isDisabled}
        >
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link to={`/transactions/${transactionId}`}>View details</Link>
        </DropdownMenuItem>

        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(transactionId)}>
            Edit
          </DropdownMenuItem>
        )}

        {receiptUrl && onViewReceipt && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewReceipt(transactionId)}>
              View receipt
            </DropdownMenuItem>
          </>
        )}

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(transactionId)}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
