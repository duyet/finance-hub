/**
 * Cash Flow Chart Component
 *
 * Line chart showing predicted balance over time with income/expenses
 */

import type { CashFlowPrediction } from "~/lib/services/cash-flow.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp } from "lucide-react";

interface CashFlowChartProps {
  predictions: CashFlowPrediction[];
  currency?: string;
}

export function CashFlowChart({ predictions, currency = "VND" }: CashFlowChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Sort by forecast date
  const sortedPredictions = [...predictions].sort((a, b) =>
    new Date(a.forecastDate).getTime() - new Date(b.forecastDate).getTime()
  );

  // Prepare chart data
  const chartData = sortedPredictions.map((prediction) => ({
    date: new Date(prediction.forecastDate).toLocaleDateString("vi-VN", {
      month: "short",
      day: "numeric",
    }),
    balance: prediction.closingBalance,
    income: prediction.expectedIncome,
    expenses: prediction.expectedExpenses,
    confidence: prediction.confidenceLevel,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
          {payload[0]?.payload && (
            <p className="text-xs text-gray-500 mt-1">
              Confidence: {Math.round(payload[0].payload.confidence * 100)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Cash Flow Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-500">No forecast data available</p>
            <p className="text-sm text-gray-400 mt-2">
              Generate a forecast to see your cash flow projection
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Cash Flow Forecast
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="date"
                className="text-gray-600 dark:text-gray-400"
                tick={{ fill: "currentColor" }}
              />
              <YAxis
                tickFormatter={(value) => formatCurrency(value)}
                className="text-gray-600 dark:text-gray-400"
                tick={{ fill: "currentColor" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
                name="Balance"
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.2}
                name="Income"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.2}
                name="Expenses"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Balance Trend Chart */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
            Balance Trend
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="date"
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
                  dataKey="balance"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6" }}
                  activeDot={{ r: 6 }}
                  name="Balance"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
