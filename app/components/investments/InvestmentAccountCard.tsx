/**
 * Investment Account Card Component
 *
 * Displays summary of an investment account
 */

import { Card } from "~/components/ui/card";
import { TrendingUp, TrendingDown, Building2 } from "lucide-react";
import type { InvestmentAccount } from "~/lib/services/investments.server";

interface InvestmentAccountCardProps {
  account: InvestmentAccount;
  onClick?: () => void;
}

export function InvestmentAccountCard({ account, onClick }: InvestmentAccountCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: account.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const isPositive = account.totalGainLoss >= 0;

  return (
    <Card
      className={onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{account.name}</h3>
              <p className="text-sm text-gray-600">{account.institution || "Unknown Institution"}</p>
            </div>
          </div>
          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
            {account.accountType.replace("_", " ").toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Value</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(account.totalValue)}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Gain/Loss</p>
            <div className="flex items-center gap-1">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <p className={`text-lg font-bold ${isPositive ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(Math.abs(account.totalGainLoss))}
              </p>
            </div>
            <p className={`text-xs ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {formatPercent(account.totalGainLossPercent)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Cost Basis</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(account.totalCostBasis)}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
