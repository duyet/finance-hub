/**
 * Monthly Pattern Chart Component
 *
 * Line chart showing spending trends by month
 */

import type { MonthlySpendingPattern } from "~/lib/services/spending-insights.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface MonthlyPatternChartProps {
  data: MonthlySpendingPattern[];
  currency?: string;
}

export function MonthlyPatternChart({
  data,
  currency = "VND",
}: MonthlyPatternChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
          <p className="text-sm text-blue-600">
            Total: {formatCurrency(data.totalAmount)}
          </p>
          <p className="text-xs text-gray-500">
            Avg: {formatCurrency(data.averageAmount)}
          </p>
          <p className="text-xs text-gray-500">
            {data.transaction_count} transactions
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
          Monthly Spending Patterns
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No monthly data available</p>
          </div>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="monthName"
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fill: "currentColor" }}
                />
                <YAxis
                  tickFormatter={(value) => formatCurrency(value)}
                  className="text-gray-600 dark:text-gray-400"
                  tick={{ fill: "currentColor" }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="totalAmount"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Total"
                />
                <Line
                  type="monotone"
                  dataKey="averageAmount"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: "#10b981", r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Average"
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
