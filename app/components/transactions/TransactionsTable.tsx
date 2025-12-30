import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Checkbox } from "~/components/ui/checkbox";
import { StatusBadge, TransactionActions } from "./TransactionActions";
import { CategoryBadgeMini } from "./CategoryBadge";
import { formatCurrency } from "~/lib/i18n/currency";
import type { TransactionWithRelations, PaginationOptions } from "~/lib/db/transactions.server";

/**
 * Transactions table props
 */
interface TransactionsTableProps {
  transactions: TransactionWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  pagination: PaginationOptions;
  selectedIds: string[];
  onSelectAll: () => void;
  onSelectOne: (id: string) => void;
  onSort: (sortBy: string, sortOrder: "asc" | "desc") => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * Sortable table header cell
 */
interface SortableHeaderProps {
  children: React.ReactNode;
  column: string;
  currentSort: string;
  currentOrder: "asc" | "desc";
  onSort: (column: string) => void;
}

function SortableHeader({
  children,
  column,
  currentSort,
  currentOrder,
  onSort,
}: SortableHeaderProps) {
  const isActive = currentSort === column;
  const icon = isActive && currentOrder === "asc" ? "↑" : "↓";

  return (
    <TableHead
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onSort(column)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSort(column);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Sort by ${column}${isActive ? `, currently ${currentOrder === "asc" ? "ascending" : "descending"}` : ""}`}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive && (
          <span className="text-xs text-muted-foreground" aria-hidden="true">{icon}</span>
        )}
      </div>
    </TableHead>
  );
}

/**
 * Account icon component
 */
interface AccountIconProps {
  type: string;
  color?: string | null;
}

function AccountIcon({ type, color }: AccountIconProps) {
  const icons: Record<string, string> = {
    CHECKING: "🏦",
    SAVINGS: "💰",
    CREDIT_CARD: "💳",
    LOAN: "📊",
    WALLET: "👛",
    INVESTMENT: "📈",
  };

  const icon = icons[type] || "💵";

  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted"
      style={{ backgroundColor: color || undefined }}
      title={type}
    >
      {icon}
    </span>
  );
}

/**
 * Transactions table component
 * Displays transactions with sorting, pagination, and selection
 */
export function TransactionsTable({
  transactions,
  total,
  page,
  pageSize,
  pagination,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onSort,
  onEdit,
  onDelete,
}: TransactionsTableProps) {
  const allSelected = transactions.length > 0 && selectedIds.length === transactions.length;

  const handleSort = (column: string) => {
    const newOrder: "asc" | "desc" =
      pagination.sortBy === column && pagination.sortOrder === "asc" ? "desc" : "asc";
    onSort(column, newOrder);
  };

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground text-lg">No transactions found</p>
        <p className="text-muted-foreground text-sm mt-2">
          Try adjusting your filters or add a new transaction.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <SortableHeader
                column="date"
                currentSort={pagination.sortBy || "date"}
                currentOrder={pagination.sortOrder || "desc"}
                onSort={handleSort}
              >
                Date
              </SortableHeader>
              <TableHead>Description</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Account</TableHead>
              <SortableHeader
                column="amount"
                currentSort={pagination.sortBy || "date"}
                currentOrder={pagination.sortOrder || "desc"}
                onSort={handleSort}
              >
                Amount
              </SortableHeader>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => {
              const isIncome = transaction.amount >= 0;
              const amountClass = isIncome ? "text-green-600" : "text-red-600";

              return (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(transaction.id)}
                      onCheckedChange={() => onSelectOne(transaction.id)}
                      aria-label={`Select transaction ${transaction.id}`}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {new Date(transaction.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      to={`/transactions/${transaction.id}`}
                      className="hover:text-primary hover:underline"
                    >
                      {transaction.description}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {transaction.merchant_name || "-"}
                  </TableCell>
                  <TableCell>
                    <CategoryBadgeMini
                      name={transaction.category_name}
                      type={transaction.category_type as "INCOME" | "EXPENSE" | null}
                      color={transaction.category_color}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <AccountIcon type={transaction.account_type} color={transaction.account_color} />
                      <span className="text-sm">{transaction.account_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className={`font-medium ${amountClass}`}>
                    {formatCurrency(transaction.amount, { currency: "VND" })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={transaction.status} />
                  </TableCell>
                  <TableCell>
                    <TransactionActions
                      transactionId={transaction.id}
                      receiptUrl={transaction.receipt_url}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Showing {Math.min((page - 1) * pageSize + 1, total)} to{" "}
          {Math.min(page * pageSize, total)} of {total} transactions
        </p>
      </div>
    </div>
  );
}
