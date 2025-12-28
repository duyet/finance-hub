/**
 * AmortizationTable Component
 *
 * Displays the complete amortization schedule for a loan
 */

import { useState } from "react";
import type { Locale } from "~/lib/i18n/i18n.config";
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

// Helper functions that work on both client and server
function formatCurrency(amount: number, currencyCode: string, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function formatDate(date: string, locale: Locale, format: string): string {
  const dateObj = new Date(date);
  const options: Intl.DateTimeFormatOptions = format === "medium"
    ? { year: "numeric", month: "short", day: "numeric" }
    : { year: "numeric", month: "2-digit", day: "2-digit" };
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

interface Installment {
  id: string;
  due_date: string;
  installment_number: number;
  principal_opening: number;
  principal_component: number;
  interest_component: number;
  total_amount: number;
  principal_closing: number;
  status: "ESTIMATED" | "DUE" | "PAID" | "OVERDUE" | "WAIVED";
  paid_date?: string | null;
  paid_amount?: number | null;
  notes?: string | null;
}

interface AmortizationTableProps {
  installments: Installment[];
  locale: Locale;
  currencyCode?: string;
}

export function AmortizationTable({ installments, locale, currencyCode = "USD" }: AmortizationTableProps) {
  const [showAll, setShowAll] = useState(false);

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge variant="default" className="bg-green-600">Paid</Badge>;
      case "DUE":
        return <Badge variant="default" className="bg-blue-600">Due</Badge>;
      case "OVERDUE":
        return <Badge variant="destructive">Overdue</Badge>;
      case "WAIVED":
        return <Badge variant="secondary">Waived</Badge>;
      default:
        return <Badge variant="outline">Estimated</Badge>;
    }
  };

  // Highlight upcoming payment
  const today = new Date();
  const upcomingIndex = installments.findIndex((inst) => {
    const dueDate = new Date(inst.due_date);
    return dueDate >= today && inst.status !== "PAID";
  });

  // Show first 12 installments by default, or all if showAll is true
  const displayInstallments = showAll ? installments : installments.slice(0, 12);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Amortization Schedule</h3>
        {installments.length > 12 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : `Show All (${installments.length})`}
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">#</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Principal (Opening)</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Interest</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Total Payment</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayInstallments.map((inst, index) => {
                const isUpcoming = index === upcomingIndex;
                const isPaid = inst.status === "PAID";
                const isOverdue = inst.status === "OVERDUE";

                return (
                  <TableRow
                    key={inst.id}
                    className={
                      isUpcoming
                        ? "bg-blue-50 font-medium"
                        : isPaid
                        ? "bg-gray-50"
                        : isOverdue
                        ? "bg-red-50"
                        : ""
                    }
                  >
                    <TableCell className="text-sm">{inst.installment_number}</TableCell>
                    <TableCell className="text-sm">
                      <div>
                        <div>{formatDate(inst.due_date, locale, "short")}</div>
                        {inst.paid_date && (
                          <div className="text-xs text-gray-500">
                            Paid: {formatDate(inst.paid_date, locale, "short")}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {formatCurrency(inst.principal_opening, currencyCode, locale)}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {inst.interest_component > 0 && inst.principal_opening > 0
                        ? ((inst.interest_component / inst.principal_opening) * 12 * 100).toFixed(2) + "%"
                        : "0.00%"}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {formatCurrency(inst.interest_component, currencyCode, locale)}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {formatCurrency(inst.principal_component, currencyCode, locale)}
                    </TableCell>
                    <TableCell className="text-sm text-right font-medium">
                      {formatCurrency(inst.total_amount, currencyCode, locale)}
                    </TableCell>
                    <TableCell className="text-sm text-right">
                      {formatCurrency(inst.principal_closing, currencyCode, locale)}
                    </TableCell>
                    <TableCell>{getStatusBadge(inst.status)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {!showAll && installments.length > 12 && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(true)}
          >
            Load {installments.length - 12} More Installments
          </Button>
        </div>
      )}
    </div>
  );
}
