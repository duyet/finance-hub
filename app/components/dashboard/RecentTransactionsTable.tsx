/**
 * RecentTransactionsTable Component
 *
 * Displays recent transactions with links to transaction details
 * Shows date, merchant, category badge, account, and colored amount
 */

import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { useI18n } from "~/lib/i18n/client";
import type { RecentTransaction } from "~/lib/db/transactions.server";
import { format } from "date-fns";

interface RecentTransactionsTableProps {
  transactions: RecentTransaction[];
  currency?: string;
}

export function RecentTransactionsTable({
  transactions,
  currency = "VND",
}: RecentTransactionsTableProps) {
  const { formatCurrency, formatDate, locale } = useI18n();

  if (transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <p>No transactions yet</p>
      </div>
    );
  }

  // Format date based on locale
  const formatTransactionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return locale === "vi"
      ? format(date, "dd/MM/yyyy")
      : format(date, "MM/dd/yyyy");
  };

  // Get status badge color
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "POSTED":
      case "CLEARED":
      case "RECONCILED":
        return "default";
      case "PENDING":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} className="hover:bg-gray-50">
              <TableCell className="text-sm text-gray-600">
                {formatTransactionDate(transaction.date)}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-gray-900">
                    {transaction.description}
                  </p>
                  {transaction.merchantName && (
                    <p className="text-xs text-gray-500">
                      {transaction.merchantName}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {transaction.categoryName && (
                  <Badge variant={getStatusBadgeVariant(transaction.status)}>
                    {transaction.categoryName}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {transaction.accountName}
              </TableCell>
              <TableCell className={`text-right font-medium ${
                transaction.amount >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                {formatCurrency(transaction.amount, currency as any)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="border-t p-3">
        <Link
          to="/transactions"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View all transactions →
        </Link>
      </div>
    </div>
  );
}
