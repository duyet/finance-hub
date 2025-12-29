/**
 * Daily Heatmap Calendar Component
 *
 * GitHub-style contribution calendar showing daily spending intensity
 */

import type { DailySpendingHeatmap } from "~/lib/services/spending-insights.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Calendar } from "lucide-react";

interface DailyHeatmapCalendarProps {
  data: DailySpendingHeatmap[];
  year?: number;
  currency?: string;
}

export function DailyHeatmapCalendar({
  data,
  year = new Date().getFullYear(),
  currency = "VND",
}: DailyHeatmapCalendarProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get intensity color (0-9 scale)
  const getIntensityColor = (intensity: number) => {
    const colors = [
      "bg-gray-100 dark:bg-gray-800", // 0
      "bg-green-100 dark:bg-green-950", // 1
      "bg-green-200 dark:bg-green-900", // 2
      "bg-green-300 dark:bg-green-800", // 3
      "bg-green-400 dark:bg-green-700", // 4
      "bg-green-500 dark:bg-green-600", // 5
      "bg-green-600 dark:bg-green-500", // 6
      "bg-green-700 dark:bg-green-400", // 7
      "bg-green-800 dark:bg-green-300", // 8
      "bg-green-900 dark:bg-green-200", // 9
    ];
    return colors[intensity] || colors[0];
  };

  // Group data by week
  const weeks: DailySpendingHeatmap[][] = [];
  const week: DailySpendingHeatmap[] = [];

  // Find first Sunday to start the calendar
  let startIndex = 0;
  if (data.length > 0) {
    const firstDate = new Date(data[0].date);
    const firstDayOfWeek = firstDate.getDay();
    startIndex = firstDayOfWeek;
  }

  // Add empty cells for days before first data
  for (let i = 0; i < startIndex; i++) {
    week.push({
      date: "",
      amount: 0,
      transactionCount: 0,
      intensity: 0,
    });
  }

  // Add data points
  for (const day of data) {
    week.push(day);

    if (week.length === 7) {
      weeks.push([...week]);
      week.length = 0;
    }
  }

  // Add remaining week
  if (week.length > 0) {
    while (week.length < 7) {
      week.push({
        date: "",
        amount: 0,
        transactionCount: 0,
        intensity: 0,
      });
    }
    weeks.push(week);
  }

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Calculate month positions for labels
  const monthLabels: { month: string; col: number }[] = [];
  let currentMonth = -1;

  for (let i = 0; i < weeks.length; i++) {
    if (weeks[i][0]?.date) {
      const monthIndex = new Date(weeks[i][0].date).getMonth();
      if (monthIndex !== currentMonth) {
        monthLabels.push({ month: months[monthIndex], col: i });
        currentMonth = monthIndex;
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Daily Spending Heatmap - {year}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Month labels */}
            <div className="flex mb-2 pl-8">
              {monthLabels.map((label) => (
                <div
                  key={label.month}
                  className="text-xs text-gray-500"
                  style={{ marginLeft: label.col === 0 ? 0 : `${label.col * 14}px` }}
                >
                  {label.month}
                </div>
              ))}
            </div>

            <div className="flex">
              {/* Day labels */}
              <div className="flex flex-col gap-1 mr-2 text-xs text-gray-500">
                {days.map((day) => (
                  <div key={day} className="h-3 w-8 flex items-center">
                    {day}
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              <div className="flex gap-1">
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-1">
                    {week.map((day, dayIndex) => (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`w-3 h-3 rounded-sm ${getIntensityColor(day.intensity)} cursor-pointer transition-all hover:ring-2 hover:ring-blue-500`}
                        title={
                          day.date
                            ? `${day.date}\n${formatCurrency(day.amount)} (${day.transactionCount} transactions)`
                            : ""
                        }
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 text-xs text-gray-600">
              <span>Less</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                  <div
                    key={level}
                    className={`w-3 h-3 rounded-sm ${getIntensityColor(level)}`}
                  />
                ))}
              </div>
              <span>More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
