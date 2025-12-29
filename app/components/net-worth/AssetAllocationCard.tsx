/**
 * Asset Allocation Card Component
 *
 * Displays breakdown of assets and liabilities
 */

import type { NetWorthSnapshot } from "~/lib/services/net-worth.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

interface AssetAllocationCardProps {
  snapshot: NetWorthSnapshot | null;
  currency?: string;
}

const ASSETS_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];
const LIABILITIES_COLORS = ["#ef4444", "#f97316", "#ec4899", "#6b7280"];

export function AssetAllocationCard({ snapshot, currency = "VND" }: AssetAllocationCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (!snapshot) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            Asset Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500">No snapshot data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare assets data
  const assetsData = [
    { name: "Cash", value: snapshot.cash, color: ASSETS_COLORS[0] },
    { name: "Investments", value: snapshot.investments, color: ASSETS_COLORS[1] },
    { name: "Property", value: snapshot.property, color: ASSETS_COLORS[2] },
    { name: "Other", value: snapshot.otherAssets, color: ASSETS_COLORS[3] },
  ].filter((item) => item.value > 0);

  // Prepare liabilities data
  const liabilitiesData = [
    { name: "Credit Cards", value: snapshot.creditCardDebt, color: LIABILITIES_COLORS[0] },
    { name: "Loans", value: snapshot.loans, color: LIABILITIES_COLORS[1] },
    { name: "Mortgage", value: snapshot.mortgage, color: LIABILITIES_COLORS[2] },
    { name: "Other", value: snapshot.otherLiabilities, color: LIABILITIES_COLORS[3] },
  ].filter((item) => item.value > 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.name}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            {formatCurrency(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5" />
          Asset Allocation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assets */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Assets</p>
            {assetsData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No assets</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={assetsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {assetsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {assetsData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Liabilities */}
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Liabilities</p>
            {liabilitiesData.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No liabilities</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={liabilitiesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {liabilitiesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {liabilitiesData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
