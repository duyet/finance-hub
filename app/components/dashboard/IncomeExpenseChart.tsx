/**
 * IncomeExpenseChart Component
 *
 * Stacked bar chart showing income vs expenses over time
 * Click on a bar to drill down into category breakdown
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useI18n } from "~/lib/i18n/client";
import type { MonthlyDataPoint } from "~/lib/db/transactions.server";

interface IncomeExpenseChartProps {
  data: MonthlyDataPoint[];
  currency?: string;
  onBarClick?: (month: string) => void;
}

export function IncomeExpenseChart({
  data,
  currency = "VND",
  onBarClick,
}: IncomeExpenseChartProps) {
  const { formatCurrency, locale } = useI18n();

  // Format month labels based on locale
  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return locale === "vi"
      ? `${String(date.getMonth() + 1).padStart(2, "0")}/${year}`
      : date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  };

  // Format tooltip values
  const formatTooltipValue = (value: number) => {
    return formatCurrency(value, currency);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{formatMonth(data.month)}</p>
          {payload.map((entry: any) => (
            <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatTooltipValue(entry.value)}
            </p>
          ))}
          <p className="text-sm text-gray-600 mt-1 pt-1 border-t">
            Net: {formatTooltipValue(data.net)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Color palette
  const incomeColor = "#10b981"; // green-500
  const expenseColor = "#ef4444"; // red-500

  // Transform data for chart
  const chartData = data.map((item) => ({
    ...item,
    monthLabel: formatMonth(item.month),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs Expenses</CardTitle>
        <p className="text-sm text-gray-500">
          Last {data.length} months
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            onClick={(e) => {
              if (e && e.activePayload && e.activePayload[0]) {
                onBarClick?.(e.activePayload[0].payload.month);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
            <XAxis
              dataKey="monthLabel"
              className="text-xs text-gray-600"
              tick={{ fill: "#6b7280" }}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value, currency)}
              className="text-xs text-gray-600"
              tick={{ fill: "#6b7280" }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="income"
              name="Income"
              fill={incomeColor}
              radius={[4, 4, 0, 0]}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
            <Bar
              dataKey="expenses"
              name="Expenses"
              fill={expenseColor}
              radius={[4, 4, 0, 0]}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
