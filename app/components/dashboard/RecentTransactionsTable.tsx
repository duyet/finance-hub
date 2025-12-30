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
import { Button } from "~/components/ui/button";
import { useI18n } from "~/lib/i18n/client";
import type { RecentTransaction } from "~/lib/db/transactions.server";
import { Plus } from "lucide-react";

interface RecentTransactionsTableProps {
  transactions: RecentTransaction[];
  currency?: string;
}

export function RecentTransactionsTable({
  transactions,
  currency = "VND",
}: RecentTransactionsTableProps) {
  const { formatCurrency, locale } = useI18n();

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <Plus className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-lg font-medium text-gray-900 mb-2">No transactions yet</p>
        <p className="text-sm text-gray-600 mb-4">
          Start tracking by adding your first transaction
        </p>
        <Button asChild>
          <Link to="/transactions">Add Transaction</Link>
        </Button>
      </div>
    );
  }

  // Format date based on locale
  const formatTransactionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return locale === "vi"
      ? date.toLocaleDateString("vi-VN")
      : date.toLocaleDateString("en-US");
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
                {formatCurrency(transaction.amount, currency)}
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
