/**
 * Asset Allocation Chart Component
 *
 * Simple bar chart showing asset allocation by type
 */

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { PortfolioSummary } from "~/lib/services/investments.server";

interface AssetAllocationChartProps {
  summary: PortfolioSummary;
}

const ASSET_TYPE_COLORS: Record<string, string> = {
  stock: "bg-blue-500",
  etf: "bg-green-500",
  mutual_fund: "bg-purple-500",
  bond: "bg-yellow-500",
  crypto: "bg-orange-500",
  option: "bg-red-500",
  future: "bg-pink-500",
  index: "bg-indigo-500",
  commodity: "bg-teal-500",
  forex: "bg-cyan-500",
  other: "bg-gray-500",
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  stock: "Stocks",
  etf: "ETFs",
  mutual_fund: "Mutual Funds",
  bond: "Bonds",
  crypto: "Crypto",
  option: "Options",
  future: "Futures",
  index: "Index Funds",
  commodity: "Commodities",
  forex: "Forex",
  other: "Other",
};

export function AssetAllocationChart({ summary }: AssetAllocationChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const assetEntries = Object.entries(summary.assetAllocation)
    .map(([type, value]) => ({
      type,
      value,
      percentage: summary.totalValue > 0 ? (value / summary.totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  if (assetEntries.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Asset Allocation</h3>
          <p className="text-gray-600">
            Add holdings to see your asset allocation breakdown.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assetEntries.map((entry) => (
            <div key={entry.type}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${ASSET_TYPE_COLORS[entry.type]}`} />
                  <span className="text-sm font-medium text-gray-900">
                    {ASSET_TYPE_LABELS[entry.type] || entry.type}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatCurrency(entry.value)}
                  </span>
                  <span className="text-xs text-gray-600 ml-2">
                    ({entry.percentage.toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full ${ASSET_TYPE_COLORS[entry.type]}`}
                  style={{ width: `${entry.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Top Holdings Summary */}
        {summary.topHoldings.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Holdings</h4>
            <div className="space-y-2">
              {summary.topHoldings.slice(0, 5).map((holding) => (
                <div key={holding.symbol} className="flex items-center justify-between text-sm">
                  <span className="text-gray-900 font-medium">{holding.symbol}</span>
                  <div className="text-right">
                    <span className="text-gray-900">{formatCurrency(holding.value)}</span>
                    <span className="text-gray-600 ml-2">({holding.weight.toFixed(1)}%)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
