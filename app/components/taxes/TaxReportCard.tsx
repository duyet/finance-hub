/**
 * Tax Report Card Component
 *
 * Displays summary of tax liability for a given tax year
 */

import type { TaxReport } from "~/lib/services/taxes.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface TaxReportCardProps {
  report: TaxReport;
}

export function TaxReportCard({ report }: TaxReportCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Tax Year {report.taxYear} Summary</span>
          <DollarSign className="w-5 h-5 text-gray-500" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Gains */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Gains</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(report.totalGains)}</p>
            {report.totalGains !== 0 && (
              <div className="flex items-center mt-1">
                {report.totalGains > 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm ml-1 ${report.totalGains > 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatPercent((report.totalGains / Math.abs(report.totalGains || 1)) * 100)}
                </span>
              </div>
            )}
          </div>

          {/* Short-Term Gains */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Short-Term Gains</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(report.shortTermGains)}</p>
            <p className="text-xs text-gray-500 mt-1">(&lt; 365 days, taxed as income)</p>
          </div>

          {/* Long-Term Gains */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Long-Term Gains</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(report.longTermGains)}</p>
            <p className="text-xs text-gray-500 mt-1">(≥ 365 days, preferential rate)</p>
          </div>

          {/* Positions Closed */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Positions Closed</p>
            <p className="text-2xl font-bold mt-1">{report.positionsClosed}</p>
            <p className="text-xs text-gray-500 mt-1">{report.symbols.length} symbols traded</p>
          </div>
        </div>

        {/* Investment Income */}
        {(report.dividends > 0 || report.interest > 0 || report.capitalGainDistributions > 0) && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Investment Income</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.dividends > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Dividends</p>
                  <p className="text-lg font-semibold">{formatCurrency(report.dividends)}</p>
                </div>
              )}
              {report.interest > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Interest</p>
                  <p className="text-lg font-semibold">{formatCurrency(report.interest)}</p>
                </div>
              )}
              {report.capitalGainDistributions > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Capital Gain Distributions</p>
                  <p className="text-lg font-semibold">{formatCurrency(report.capitalGainDistributions)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wash Sales */}
        {report.washSales !== 0 && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Wash Sales Adjustment</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-1">{formatCurrency(report.washSales)}</p>
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Losses disallowed due to wash sale rule</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
