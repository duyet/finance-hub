/**
 * Cash Flow Summary Card Component
 *
 * Displays current balance, forecast summary, and key metrics
 */

import type { CashFlowSummary } from "~/lib/services/cash-flow.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TrendingUp, TrendingDown, AlertTriangle, Wallet } from "lucide-react";

interface CashFlowSummaryCardProps {
  summary: CashFlowSummary;
  currency?: string;
  onRegenerate?: () => void;
}

export function CashFlowSummaryCard({
  summary,
  currency = "VND",
  onRegenerate,
}: CashFlowSummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      month: "short",
      day: "numeric",
    });
  };

  const isPositive = summary.netChange >= 0;
  const hasAlert = summary.daysBelowThreshold > 0 || summary.hasCriticalAlerts;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Cash Flow Forecast
          </span>
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Regenerate
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Current Balance */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Current Balance</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(summary.currentBalance)}
            </p>
          </div>

          {/* Minimum Balance */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Minimum Balance</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(summary.minBalance)}
              </p>
              {summary.minBalance < summary.currentBalance * 0.5 && (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              )}
            </div>
            {summary.minBalanceDate && (
              <p className="text-xs text-gray-500">{formatDate(summary.minBalanceDate)}</p>
            )}
          </div>

          {/* Net Change */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Net Change</p>
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <p
                className={`text-2xl font-bold ${
                  isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(Math.abs(summary.netChange))}
              </p>
            </div>
            <p className="text-xs text-gray-500">
              {summary.totalExpenses > 0 ? "Income" : "Expenses"} vs{" "}
              {summary.totalExpenses > 0 ? "Expenses" : "Income"}
            </p>
          </div>

          {/* Alert Status */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Alert Status</p>
            {hasAlert ? (
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={`w-5 h-5 ${
                    summary.hasCriticalAlerts ? "text-red-600" : "text-amber-500"
                  }`}
                />
                <p
                  className={`text-lg font-semibold ${
                    summary.hasCriticalAlerts ? "text-red-600" : "text-amber-600"
                  }`}
                >
                  {summary.daysBelowThreshold} {summary.daysBelowThreshold === 1 ? "day" : "days"} low
                </p>
              </div>
            ) : (
              <p className="text-lg font-semibold text-green-600">All clear</p>
            )}
          </div>
        </div>

        {/* Income vs Expenses Bar */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Total Income</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(summary.totalIncome)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Total Expenses</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(summary.totalExpenses)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden flex">
            <div
              className="bg-green-500 h-3 transition-all"
              style={{
                width: `${Math.min(
                  100,
                  (summary.totalIncome / (summary.totalIncome + summary.totalExpenses)) * 100
                )}%`,
              }}
            />
            <div
              className="bg-red-500 h-3 transition-all"
              style={{
                width: `${Math.min(
                  100,
                  (summary.totalExpenses / (summary.totalIncome + summary.totalExpenses)) * 100
                )}%`,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
