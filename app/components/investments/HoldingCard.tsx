/**
 * Holding Card Component
 *
 * Displays a single investment holding with performance metrics
 */

import { Card } from "~/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { InvestmentHolding } from "~/lib/services/investments.server";

interface HoldingCardProps {
  holding: InvestmentHolding;
  currency?: string;
}

export function HoldingCard({ holding, currency = "USD" }: HoldingCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  const isPositive = holding.gainLoss >= 0;

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{holding.symbol}</h3>
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
              {holding.assetType.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">{holding.name}</p>
        </div>
        <div className={`flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
          {isPositive ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span className="font-semibold">{formatPercent(holding.gainLossPercent)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Shares</p>
          <p className="font-semibold text-gray-900">{holding.quantity.toFixed(4)}</p>
        </div>
        <div>
          <p className="text-gray-600">Avg Cost</p>
          <p className="font-semibold text-gray-900">{formatCurrency(holding.avgCostBasis)}</p>
        </div>
        <div>
          <p className="text-gray-600">Current Price</p>
          <p className="font-semibold text-gray-900">{formatCurrency(holding.currentPrice)}</p>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Value</p>
          <p className="font-semibold text-gray-900">{formatCurrency(holding.currentValue)}</p>
        </div>
        <div>
          <p className="text-gray-600">Gain/Loss</p>
          <p className={`font-semibold ${isPositive ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(holding.gainLoss)}
          </p>
        </div>
      </div>
    </div>
  );
}
