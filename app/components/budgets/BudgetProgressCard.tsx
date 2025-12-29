/**
 * Budget Progress Card Component
 *
 * Displays budget status with progress bar and spending information
 */

import type { BudgetData } from "~/lib/services/budgets.server";

interface BudgetProgressCardProps {
  budget: BudgetData;
  currency?: string;
  onClick?: () => void;
}

const STATUS_STYLES = {
  healthy: {
    bg: "bg-green-50",
    border: "border-green-200",
    progress: "bg-green-500",
    text: "text-green-700",
    icon: "✓",
  },
  warning: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    progress: "bg-yellow-500",
    text: "text-yellow-700",
    icon: "⚠️",
  },
  critical: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    progress: "bg-orange-500",
    text: "text-orange-700",
    icon: "🔥",
  },
  exceeded: {
    bg: "bg-red-50",
    border: "border-red-200",
    progress: "bg-red-500",
    text: "text-red-700",
    icon: "🚨",
  },
};

export function BudgetProgressCard({ budget, currency = "VND", onClick }: BudgetProgressCardProps) {
  const styles = STATUS_STYLES[budget.status];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      onClick={onClick}
      className={`${styles.bg} ${styles.border} border rounded-xl p-5 transition-all hover:shadow-md ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {budget.icon && (
            <span className="text-2xl flex items-center justify-center w-10 h-10 rounded-full bg-white/80">
              {budget.icon}
            </span>
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{budget.name}</h3>
            <p className="text-sm text-gray-600">
              {budget.transactionCount} transaction{budget.transactionCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <span className={`${styles.bg} ${styles.text} px-2 py-1 rounded-lg text-xs font-semibold`}>
          {styles.icon} {budget.budgetUsagePercentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className={`${styles.progress} h-full rounded-full transition-all duration-500 ease-out`}
            style={{ width: `${Math.min(budget.budgetUsagePercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Spending Details */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xs text-gray-600 mb-1">Budget</p>
          <p className="font-semibold text-gray-900">{formatCurrency(budget.budgetLimit)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">Spent</p>
          <p className={`font-semibold ${budget.status === "exceeded" ? "text-red-600" : "text-gray-900"}`}>
            {formatCurrency(budget.monthlySpending)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-600 mb-1">{budget.remaining >= 0 ? "Remaining" : "Over"}</p>
          <p className={`font-semibold ${budget.remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(Math.abs(budget.remaining))}
          </p>
        </div>
      </div>
    </div>
  );
}
