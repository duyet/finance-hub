/**
 * Capital Gains Table Component
 *
 * Displays breakdown of gains/losses by symbol with short-term and long-term split
 */

import type { TaxReport } from "~/lib/services/taxes.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";

interface CapitalGainsTableProps {
  report: TaxReport;
}

type SortField = "symbol" | "shortTermGainLoss" | "longTermGainLoss" | "totalGainLoss";
type SortOrder = "asc" | "desc";

export function CapitalGainsTable({ report }: CapitalGainsTableProps) {
  const [sortField, setSortField] = useState<SortField>("totalGainLoss");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedSymbols = [...report.symbols].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capital Gains by Symbol</CardTitle>
      </CardHeader>
      <CardContent>
        {report.symbols.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No capital gains data for this tax year</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4">
                    <button
                      onClick={() => handleSort("symbol")}
                      className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600"
                    >
                      Symbol
                      {sortField === "symbol" && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4">
                    <button
                      onClick={() => handleSort("shortTermGainLoss")}
                      className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 ml-auto"
                    >
                      Short-Term
                      {sortField === "shortTermGainLoss" && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4">
                    <button
                      onClick={() => handleSort("longTermGainLoss")}
                      className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 ml-auto"
                    >
                      Long-Term
                      {sortField === "longTermGainLoss" && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-right py-3 px-4">
                    <button
                      onClick={() => handleSort("totalGainLoss")}
                      className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 ml-auto"
                    >
                      Total
                      {sortField === "totalGainLoss" && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSymbols.map((symbol) => (
                  <tr key={symbol.symbol} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                    <td className="py-3 px-4 font-medium">{symbol.symbol}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {symbol.shortTermGainLoss !== 0 && (
                          symbol.shortTermGainLoss > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )
                        )}
                        <span className={symbol.shortTermGainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(symbol.shortTermGainLoss)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {symbol.longTermGainLoss !== 0 && (
                          symbol.longTermGainLoss > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )
                        )}
                        <span className={symbol.longTermGainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(symbol.longTermGainLoss)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {symbol.totalGainLoss > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600" />
                        ) : symbol.totalGainLoss < 0 ? (
                          <TrendingDown className="w-4 h-4 text-red-600" />
                        ) : null}
                        <span className={`font-semibold ${symbol.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                          {formatCurrency(symbol.totalGainLoss)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
