/**
 * Hourly Pattern Chart Component
 *
 * Bar chart showing spending patterns by hour of day
 */

import type { HourlySpendingPattern } from "~/lib/services/spending-insights.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Clock } from "lucide-react";

interface HourlyPatternChartProps {
  data: HourlySpendingPattern[];
  currency?: string;
}

export function HourlyPatternChart({
  data,
  currency = "VND",
}: HourlyPatternChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}${period}`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formatHour(data.hour)}</p>
          <p className="text-sm text-blue-600">
            Total: {formatCurrency(data.totalAmount)}
          </p>
          <p className="text-xs text-gray-500">
            {data.transaction_count} transactions
          </p>
        </div>
      );
    }
    return null;
  };

  // Prepare chart data
  const chartData = data.map((item) => ({
    ...item,
    hourLabel: formatHour(item.hour),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Spending by Hour of Day
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No hourly data available</p>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="hourLabel"
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fill: "currentColor" }}
                  interval={2}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fill: "currentColor" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalAmount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
