/**
 * Portfolio Summary Card Component
 *
 * Displays overall portfolio statistics and performance
 */

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TrendingUp, TrendingDown, Wallet, Briefcase, DollarSign } from "lucide-react";
import type { PortfolioSummary } from "~/lib/services/investments.server";

interface PortfolioSummaryCardProps {
  summary: PortfolioSummary;
  currency?: string;
}

export function PortfolioSummaryCard({ summary, currency = "VND" }: PortfolioSummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const isPositive = summary.totalGainLoss >= 0;
  const isDayPositive = summary.dayChange >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Portfolio Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Value</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalValue)}</p>
            <div className="flex items-center gap-1 mt-1">
              {isDayPositive ? (
                <TrendingUp className="w-3 h-3 text-green-600" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600" />
              )}
              <span className={`text-xs ${isDayPositive ? "text-green-600" : "text-red-600"}`}>
                {formatPercent(summary.dayChangePercent)} today
              </span>
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Total Gain/Loss</p>
            <p className={`text-2xl font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(Math.abs(summary.totalGainLoss))}
            </p>
            <span className={`text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {formatPercent(summary.totalGainLossPercent)}
            </span>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Cost Basis</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalCostBasis)}</p>
            <p className="text-xs text-gray-500 mt-1">Invested amount</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Cash Balance</p>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.cashBalance)}</p>
            <p className="text-xs text-gray-500 mt-1">Available to invest</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Accounts</p>
              <p className="text-lg font-semibold text-gray-900">{summary.accountsCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Holdings</p>
              <p className="text-lg font-semibold text-gray-900">{summary.holdingsCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Asset Types</p>
              <p className="text-lg font-semibold text-gray-900">{Object.keys(summary.assetAllocation).length}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
