/**
 * Tax Lot Table Component
 *
 * Displays detailed tax lot tracking with acquisition and disposition information
 */

import type { TaxLot } from "~/lib/services/taxes.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useState } from "react";

interface TaxLotTableProps {
  lots: TaxLot[];
  currency?: string;
}

type SortField = "symbol" | "acquisitionDate" | "quantity" | "acquisitionPrice" | "gainLoss" | "holdingPeriodDays";
type SortOrder = "asc" | "desc";

export function TaxLotTable({ lots, currency = "VND" }: TaxLotTableProps) {
  const [sortField, setSortField] = useState<SortField>("acquisitionDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedLots = [...lots].sort((a, b) => {
    let aVal: string | number;
    let bVal: string | number;

    switch (sortField) {
      case "symbol":
        aVal = a.symbol;
        bVal = b.symbol;
        break;
      case "acquisitionDate":
        aVal = a.acquisitionDate;
        bVal = b.acquisitionDate;
        break;
      case "quantity":
        aVal = a.quantity;
        bVal = b.quantity;
        break;
      case "acquisitionPrice":
        aVal = a.acquisitionPrice;
        bVal = b.acquisitionPrice;
        break;
      case "gainLoss":
        aVal = a.gainLoss;
        bVal = b.gainLoss;
        break;
      case "holdingPeriodDays":
        aVal = a.holdingPeriodDays;
        bVal = b.holdingPeriodDays;
        break;
      default:
        aVal = a.symbol;
        bVal = b.symbol;
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Lots</CardTitle>
      </CardHeader>
      <CardContent>
        {lots.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No tax lots found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-3">
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
                  <th className="text-left py-3 px-3">
                    <button
                      onClick={() => handleSort("acquisitionDate")}
                      className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600"
                    >
                      Acquired
                      {sortField === "acquisitionDate" && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-right py-3 px-3">
                    <button
                      onClick={() => handleSort("quantity")}
                      className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 ml-auto"
                    >
                      Qty
                      {sortField === "quantity" && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-right py-3 px-3">
                    <button
                      onClick={() => handleSort("acquisitionPrice")}
                      className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 ml-auto"
                    >
                      Cost Basis
                      {sortField === "acquisitionPrice" && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-center py-3 px-3">Disposed</th>
                  <th className="text-right py-3 px-3">Proceeds</th>
                  <th className="text-right py-3 px-3">
                    <button
                      onClick={() => handleSort("gainLoss")}
                      className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 ml-auto"
                    >
                      Gain/Loss
                      {sortField === "gainLoss" && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                  <th className="text-center py-3 px-3">
                    <button
                      onClick={() => handleSort("holdingPeriodDays")}
                      className="flex items-center gap-1 font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600"
                    >
                      Held
                      {sortField === "holdingPeriodDays" && (
                        <span className="text-xs">{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedLots.map((lot) => (
                  <tr
                    key={lot.id}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 ${
                      lot.isWashSale ? "bg-amber-50 dark:bg-amber-950" : ""
                    }`}
                  >
                    <td className="py-2 px-3 font-medium">{lot.symbol}</td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                      {formatDate(lot.acquisitionDate)}
                    </td>
                    <td className="py-2 px-3 text-right">{lot.quantity}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(lot.costBasis)}</td>
                    <td className="py-2 px-3 text-center text-gray-600 dark:text-gray-400">
                      {lot.dispositionDate ? formatDate(lot.dispositionDate) : "-"}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">
                      {lot.isClosed ? formatCurrency(lot.proceeds) : "-"}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {lot.isClosed ? (
                        <div className="flex items-center justify-end gap-1">
                          {lot.gainLoss > 0 ? (
                            <TrendingUp className="w-3 h-3 text-green-600" />
                          ) : lot.gainLoss < 0 ? (
                            <TrendingDown className="w-3 h-3 text-red-600" />
                          ) : null}
                          <span className={`font-medium ${lot.gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(lot.gainLoss)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">Open</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          lot.isClosed
                            ? lot.holdingPeriodDays >= 365
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {lot.isClosed
                          ? lot.holdingPeriodDays >= 365
                            ? `LT ${lot.holdingPeriodDays}d`
                            : `ST ${lot.holdingPeriodDays}d`
                          : `${lot.holdingPeriodDays}d`}
                      </span>
                      {lot.isWashSale && (
                        <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">WS</span>
                      )}
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
