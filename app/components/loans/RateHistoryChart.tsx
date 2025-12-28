/**
 * RateHistoryChart Component
 *
 * Displays a line chart showing interest rate changes over time
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { Locale } from "~/lib/i18n/i18n.config";

// Helper functions that work on both client and server
function formatDate(date: string, locale: Locale, format: string): string {
  const dateObj = new Date(date);
  const options: Intl.DateTimeFormatOptions = format === "medium"
    ? { year: "numeric", month: "short", day: "numeric" }
    : { year: "numeric", month: "2-digit", day: "2-digit" };
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

interface RateEvent {
  id: string;
  effective_date: string;
  rate_percentage: number;
  rate_type: "FIXED" | "FLOATING" | "TEASER";
  reason: string | null;
}

interface RateHistoryChartProps {
  rateEvents: RateEvent[];
  locale: Locale;
}

export function RateHistoryChart({ rateEvents, locale }: RateHistoryChartProps) {
  // Sort rate events by effective date and prepare chart data
  const chartData = useMemo(() => {
    const sorted = [...rateEvents].sort(
      (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
    );

    return sorted.map((event) => ({
      date: formatDate(event.effective_date, locale, "short"),
      fullDate: formatDate(event.effective_date, locale, "medium"),
      rate: event.rate_percentage,
      type: event.rate_type,
      reason: event.reason || "",
    }));
  }, [rateEvents, locale]);

  // Get rate type color
  const getRateTypeColor = (type: string) => {
    switch (type) {
      case "FIXED":
        return "#3b82f6"; // blue-500
      case "FLOATING":
        return "#8b5cf6"; // violet-500
      case "TEASER":
        return "#f59e0b"; // amber-500
      default:
        return "#6b7280"; // gray-500
    }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md">
          <p className="text-sm font-medium text-gray-900">{data.fullDate}</p>
          <p className="text-sm text-gray-600">
            Rate: <span className="font-semibold">{data.rate.toFixed(2)}%</span>
          </p>
          <p className="text-xs text-gray-500">Type: {data.type}</p>
          {data.reason && (
            <p className="text-xs text-gray-500 mt-1">Reason: {data.reason}</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No rate history available
      </div>
    );
  }

  return (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value.toFixed(2)}%`}
            domain={[
              (dataMin: number) => Math.max(0, Math.floor(dataMin) - 0.5),
              (dataMax: number) => Math.ceil(dataMax) + 0.5,
            ]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#4f46e5"
            strokeWidth={2}
            dot={{ fill: "#4f46e5", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            name="Interest Rate (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
