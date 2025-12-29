/**
 * Net Worth Summary Card Component
 *
 * Displays current net worth with key statistics and changes over time
 */

import type { NetWorthSummary } from "~/lib/services/net-worth.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Target, Award } from "lucide-react";

interface NetWorthSummaryCardProps {
  summary: NetWorthSummary;
  currency?: string;
}

export function NetWorthSummaryCard({ summary, currency = "VND" }: NetWorthSummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    const base = summary.currentNetWorth - value;
    if (base === 0) return "0%";
    return `${((value / base) * 100).toFixed(1)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Net Worth</span>
          <DollarSign className="w-5 h-5 text-gray-500" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Current Net Worth */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Current Net Worth</p>
          <p className="text-4xl font-bold mt-1">{formatCurrency(summary.currentNetWorth)}</p>
        </div>

        {/* Assets vs Liabilities */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Assets</p>
            <p className="text-2xl font-semibold text-green-600 mt-1">{formatCurrency(summary.totalAssets)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Liabilities</p>
            <p className="text-2xl font-semibold text-red-600 mt-1">{formatCurrency(summary.totalLiabilities)}</p>
          </div>
        </div>

        {/* Changes Over Time */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Change (1 Month)</p>
            <div className="flex items-center gap-1 mt-1">
              {summary.changeFromLastMonth > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : summary.changeFromLastMonth < 0 ? (
                <TrendingDown className="w-4 h-4 text-red-600" />
              ) : null}
              <p className={`text-lg font-semibold ${summary.changeFromLastMonth >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(summary.changeFromLastMonth)}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Change (1 Year)</p>
            <div className="flex items-center gap-1 mt-1">
              {summary.changeFromLastYear > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : summary.changeFromLastYear < 0 ? (
                <TrendingDown className="w-4 h-4 text-red-600" />
              ) : null}
              <p className={`text-lg font-semibold ${summary.changeFromLastYear >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(summary.changeFromLastYear)}
              </p>
            </div>
          </div>
        </div>

        {/* All-Time High/Low */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <div className="flex items-center gap-1">
              <Award className="w-4 h-4 text-yellow-600" />
              <p className="text-xs text-gray-600 dark:text-gray-400">All-Time High</p>
            </div>
            <p className="text-lg font-semibold text-green-600 mt-1">{formatCurrency(summary.allTimeHigh)}</p>
            <p className="text-xs text-gray-500">{new Date(summary.allTimeHighDate).toLocaleDateString()}</p>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-600 dark:text-gray-400">All-Time Low</p>
            </div>
            <p className="text-lg font-semibold text-red-600 mt-1">{formatCurrency(summary.allTimeLow)}</p>
            <p className="text-xs text-gray-500">{new Date(summary.allTimeLowDate).toLocaleDateString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
