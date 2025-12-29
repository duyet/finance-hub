/**
 * Debt Summary Card Component
 *
 * Displays overall debt statistics and metrics
 */

import type { DebtSummary } from "~/lib/services/debt-planner.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CreditCard, TrendingDown, TrendingUp, Calendar, Percent } from "lucide-react";

interface DebtSummaryCardProps {
  summary: DebtSummary;
  currency?: string;
}

export function DebtSummaryCard({ summary, currency = "VND" }: DebtSummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "percent",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Debt Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Debt</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalDebt)}</p>
            <p className="text-xs text-gray-500 mt-1">{summary.debtCount} debt{summary.debtCount !== 1 ? "s" : ""}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Monthly Payment</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalMinimumPayment)}</p>
            <p className="text-xs text-gray-500 mt-1">Minimum due</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Avg Interest Rate</p>
            <p className="text-2xl font-bold text-gray-900">{formatPercent(summary.averageInterestRate)}</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-600">{formatPercent(summary.highestInterestRate)}</span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Debt Free In</p>
            <p className="text-2xl font-bold text-gray-900">{summary.debtFreeMonths} months</p>
            <p className="text-xs text-gray-500 mt-1">At minimum payments</p>
          </div>
        </div>

        {summary.debtFreeMonths > 60 && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <p className="text-sm text-orange-800">
                At your current rate, you'll be debt-free in over 5 years. Consider increasing payments.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
