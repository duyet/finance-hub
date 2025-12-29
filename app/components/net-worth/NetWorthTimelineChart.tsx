/**
 * Net Worth Timeline Chart Component
 *
 * Line chart showing net worth over time
 */

import type { NetWorthSnapshot } from "~/lib/services/net-worth.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface NetWorthTimelineChartProps {
  snapshots: NetWorthSnapshot[];
  currency?: string;
}

export function NetWorthTimelineChart({ snapshots, currency = "VND" }: NetWorthTimelineChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Sort snapshots by date ascending
  const sortedSnapshots = [...snapshots].sort((a, b) =>
    new Date(a.snapshotDate).getTime() - new Date(b.snapshotDate).getTime()
  );

  // Prepare chart data
  const chartData = sortedSnapshots.map((snapshot) => ({
    date: new Date(snapshot.snapshotDate).toLocaleDateString("vi-VN", { month: "short", day: "numeric" }),
    netWorth: snapshot.netWorth,
    assets: snapshot.totalAssets,
    liabilities: snapshot.totalLiabilities,
  }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Net Worth Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500">No historical data yet</p>
            <p className="text-sm text-gray-400 mt-2">
              Net worth snapshots will appear here over time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.date}</p>
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Net Worth: {formatCurrency(data.netWorth)}
          </p>
          <p className="text-xs text-green-600 dark:text-green-400">
            Assets: {formatCurrency(data.assets)}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">
            Liabilities: {formatCurrency(data.liabilities)}
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
          <TrendingUp className="w-5 h-5" />
          Net Worth Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="date"
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fill: "currentColor" }}
              tickFormatter={(value) => {
                if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
                if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value.toString();
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
