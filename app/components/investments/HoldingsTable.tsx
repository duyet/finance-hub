/**
 * Holdings Table Component
 *
 * Displays a table of investment holdings with sorting and filtering
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { InvestmentHolding } from "~/lib/services/investments.server";

interface HoldingsTableProps {
  holdings: InvestmentHolding[];
  currency?: string;
}

type SortField = "symbol" | "value" | "gainLoss" | "gainLossPercent";

export function HoldingsTable({ holdings, currency = "USD" }: HoldingsTableProps) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const sortedHoldings = [...holdings].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "symbol":
        comparison = a.symbol.localeCompare(b.symbol);
        break;
      case "value":
        comparison = a.currentValue - b.currentValue;
        break;
      case "gainLoss":
        comparison = a.gainLoss - b.gainLoss;
        break;
      case "gainLossPercent":
        comparison = a.gainLossPercent - b.gainLossPercent;
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  });

  if (holdings.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Holdings Yet</h3>
          <p className="text-gray-600">
            Start tracking your investments by adding your first holding.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Holdings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  <button
                    type="button"
                    onClick={() => handleSort("symbol")}
                    className="hover:text-gray-900"
                  >
                    Symbol
                    {sortField === "symbol" && (
                      <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Shares</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Avg Cost</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">Current Price</th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">
                  <button
                    type="button"
                    onClick={() => handleSort("value")}
                    className="hover:text-gray-900"
                  >
                    Value
                    {sortField === "value" && (
                      <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">
                  <button
                    type="button"
                    onClick={() => handleSort("gainLoss")}
                    className="hover:text-gray-900"
                  >
                    Gain/Loss
                    {sortField === "gainLoss" && (
                      <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">
                  <button
                    type="button"
                    onClick={() => handleSort("gainLossPercent")}
                    className="hover:text-gray-900"
                  >
                    Return
                    {sortField === "gainLossPercent" && (
                      <span className="ml-1">{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedHoldings.map((holding) => {
                const isPositive = holding.gainLoss >= 0;
                return (
                  <tr key={holding.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{holding.symbol}</td>
                    <td className="py-3 px-4 text-gray-600">{holding.name}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{holding.quantity.toFixed(4)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(holding.avgCostBasis)}</td>
                    <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(holding.currentPrice)}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-900">
                      {formatCurrency(holding.currentValue)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className={`flex items-center justify-end gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
                        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {formatCurrency(Math.abs(holding.gainLoss))}
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-right font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
                      {formatPercent(holding.gainLossPercent)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
