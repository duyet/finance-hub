/**
 * Day of Week Heatmap Card Component
 *
 * Visual representation of spending patterns by day of week
 */

import type { DayOfWeekPattern } from "~/lib/services/spending-insights.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Calendar } from "lucide-react";

interface DayOfWeekHeatmapCardProps {
  data: DayOfWeekPattern[];
  currency?: string;
}

export function DayOfWeekHeatmapCard({
  data,
  currency = "VND",
}: DayOfWeekHeatmapCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get intensity color based on amount relative to max
  const maxAmount = Math.max(...data.map((d) =>.totalAmount), 1);

  const getIntensityColor = (amount: number) => {
    const intensity = amount / maxAmount;
    if (intensity >= 0.8) return "bg-green-600 dark:bg-green-400";
    if (intensity >= 0.6) return "bg-green-500 dark:bg-green-500";
    if (intensity >= 0.4) return "bg-green-400 dark:bg-green-600";
    if (intensity >= 0.2) return "bg-green-300 dark:bg-green-700";
    return "bg-green-200 dark:bg-green-800";
  };

  // Ensure all 7 days are present
  const allDays: DayOfWeekPattern[] = [];
  const dayMap = new Map(data.map((d) => [d.dayOfWeek, d]));

  for (let i = 0; i < 7; i++) {
    allDays.push(
      dayMap.get(i) || {
        dayOfWeek: i,
        dayName: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i],
        totalAmount: 0,
        averageAmount: 0,
        transactionCount: 0,
      }
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Spending by Day of Week
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {allDays.map((day) => (
            <div key={day.dayOfWeek} className="flex items-center gap-4">
              {/* Day name */}
              <div className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">
                {day.dayName}
              </div>

              {/* Bar */}
              <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative">
                <div
                  className={`h-full ${getIntensityColor(day.totalAmount)} transition-all duration-300`}
                  style={{ width: `${Math.min(100, (day.totalAmount / maxAmount) * 100)}%` }}
                />
                <div className="absolute inset-0 flex items-center px-3">
                  {day.totalAmount > 0 && (
                    <span className="text-sm font-semibold text-white drop-shadow">
                      {formatCurrency(day.totalAmount)}
                    </span>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="w-20 text-right text-xs text-gray-500">
                {day.transactionCount} tx
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-2 mt-4 text-xs text-gray-600">
          <span>Low spending</span>
          <div className="flex gap-1">
            <div className="w-4 h-3 rounded bg-green-200 dark:bg-green-800" />
            <div className="w-4 h-3 rounded bg-green-300 dark:bg-green-700" />
            <div className="w-4 h-3 rounded bg-green-400 dark:bg-green-600" />
            <div className="w-4 h-3 rounded bg-green-500 dark:bg-green-500" />
            <div className="w-4 h-3 rounded bg-green-600 dark:bg-green-400" />
          </div>
          <span>High spending</span>
        </div>
      </CardContent>
    </Card>
  );
}
