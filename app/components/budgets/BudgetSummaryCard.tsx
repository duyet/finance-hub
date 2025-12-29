/**
 * Budget Summary Card Component
 *
 * Shows overall budget status with aggregated metrics
 */

import type { BudgetSummary } from "~/lib/services/budgets.server";
import { Wallet, TrendingUp, AlertTriangle, DollarSign } from "lucide-react";

interface BudgetSummaryCardProps {
  summary: BudgetSummary;
  currency?: string;
}

export function BudgetSummaryCard({ summary, currency = "VND" }: BudgetSummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getOverallStatus = () => {
    if (summary.overBudgetCount > 0) return "critical";
    if (summary.overallUsagePercentage >= 90) return "warning";
    if (summary.overallUsagePercentage >= 75) return "warning";
    return "healthy";
  };

  const overallStatus = getOverallStatus();

  const statusConfig = {
    healthy: {
      bg: "bg-green-50",
      border: "border-green-200",
      icon: "✓",
      iconBg: "bg-green-100",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      icon: "⚠️",
      iconBg: "bg-yellow-100",
    },
    critical: {
      bg: "bg-red-50",
      border: "border-red-200",
      icon: "🚨",
      iconBg: "bg-red-100",
    },
  };

  const config = statusConfig[overallStatus];

  return (
    <div className={`${config.bg} ${config.border} border rounded-xl p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Budget Overview</h2>
        <div className={`${config.iconBg} p-2 rounded-lg`}>
          <Wallet className="w-5 h-5 text-gray-700" />
        </div>
      </div>

      {/* Overall Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Overall Usage</span>
          <span className={`text-sm font-semibold ${
            overallStatus === "critical" ? "text-red-600" :
            overallStatus === "warning" ? "text-yellow-600" :
            "text-green-600"
          }`}>
            {summary.overallUsagePercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              overallStatus === "critical" ? "bg-red-500" :
              overallStatus === "warning" ? "bg-yellow-500" :
              "bg-green-500"
            }`}
            style={{ width: `${Math.min(summary.overallUsagePercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600">Total Budget</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(summary.totalBudget)}</p>
        </div>

        <div className="bg-white/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">Total Spent</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">{formatCurrency(summary.totalSpent)}</p>
        </div>

        <div className="bg-white/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-600">Remaining</span>
          </div>
          <p className={`text-lg font-semibold ${summary.totalRemaining >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(Math.abs(summary.totalRemaining))}
          </p>
        </div>

        <div className="bg-white/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-4 h-4 ${summary.overBudgetCount > 0 ? "text-red-600" : "text-gray-400"}`} />
            <span className="text-xs text-gray-600">Alerts</span>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            {summary.overBudgetCount + summary.warningCount}
          </p>
          <p className="text-xs text-gray-500">
            {summary.overBudgetCount} over, {summary.warningCount} at risk
          </p>
        </div>
      </div>

      {/* Category count */}
      <div className="mt-4 pt-4 border-t border-gray-300/50">
        <p className="text-sm text-gray-600">
          Tracking <span className="font-semibold text-gray-900">{summary.categoryCount}</span> budget
          {summary.categoryCount !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}
