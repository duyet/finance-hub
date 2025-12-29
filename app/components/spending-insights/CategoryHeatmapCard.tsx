/**
 * Category Heatmap Card Component
 *
 * Bar chart showing spending by category with intensity coloring
 */

import type { CategorySpendingHeatmap } from "~/lib/services/spending-insights.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Tag } from "lucide-react";

interface CategoryHeatmapCardProps {
  data: CategorySpendingHeatmap[];
  currency?: string;
  limit?: number;
}

export function CategoryHeatmapCard({
  data,
  currency = "VND",
  limit = 10,
}: CategoryHeatmapCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get color based on percentage
  const getColor = (percentage: number) => {
    if (percentage >= 30) return "#dc2626"; // red-600
    if (percentage >= 20) return "#f97316"; // orange-500
    if (percentage >= 10) return "#eab308"; // yellow-500
    if (percentage >= 5) return "#22c55e"; // green-500
    return "#3b82f6"; // blue-500
  };

  // Limit data
  const limitedData = data.slice(0, limit);

  // Prepare chart data
  const chartData = limitedData.map((item) => ({
    name: item.categoryName,
    amount: item.totalAmount,
    percentage: item.percentageOfTotal,
    color: getColor(item.percentageOfTotal),
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.name}</p>
          <p className="text-sm text-blue-600">
            {formatCurrency(data.amount)}
          </p>
          <p className="text-xs text-gray-500">
            {data.percentage.toFixed(1)}% of total
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
          <Tag className="w-5 h-5" />
          Spending by Category
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No category data available</p>
          </div>
        ) : (
          <>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                  <XAxis
                    type="category"
                    dataKey="name"
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fill: "currentColor" }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    type="number"
                    tickFormatter={(value) => formatCurrency(value)}
                    className="text-gray-600 dark:text-gray-400"
                    tick={{ fill: "currentColor" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2">
              {limitedData.map((item) => (
                <div
                  key={item.categoryId}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: getColor(item.percentageOfTotal) }}
                    />
                    <span className="text-gray-700 dark:text-gray-300">
                      {item.categoryName}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.totalAmount)}
                    </span>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {item.percentageOfTotal.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
