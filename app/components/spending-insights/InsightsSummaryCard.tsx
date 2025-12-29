/**
 * Insights Summary Card Component
 *
 * Displays key spending metrics and patterns
 */

import type { SpendingInsightsSummary } from "~/lib/services/spending-insights.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TrendingUp, TrendingDown, Target, Clock, Calendar } from "lucide-react";

interface InsightsSummaryCardProps {
  summary: SpendingInsightsSummary;
  currency?: string;
}

export function InsightsSummaryCard({
  summary,
  currency = "VND",
}: InsightsSummaryCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      month: "short",
      day: "numeric",
    });
  };

  const getHourLabel = (hour: number) => {
    if (hour === null) return "N/A";
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:00 ${period}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Spending Insights Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Period Summary */}
          <div className="md:col-span-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Last 90 Days</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Total Spending</p>
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(summary.totalPeriod)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Daily Average</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(summary.averageDaily)}
                </p>
              </div>
            </div>
          </div>

          {/* High/Low Days */}
          <div className="md:col-span-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Extremes</p>
            <div className="space-y-3">
              {summary.highestDay && (
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-600" />
                    Highest Day
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatDate(summary.highestDay.date)}
                  </p>
                  <p className="text-sm text-green-600">
                    {formatCurrency(summary.highestDay.amount)}
                  </p>
                </div>
              )}
              {summary.lowestDay && (
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-red-600" />
                    Lowest Day
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatDate(summary.lowestDay.date)}
                  </p>
                  <p className="text-sm text-red-600">
                    {formatCurrency(summary.lowestDay.amount)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Patterns */}
          <div className="md:col-span-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Patterns</p>
            <div className="space-y-3">
              {summary.topCategory && (
                <div>
                  <p className="text-xs text-gray-500">Top Category</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {summary.topCategory.name}
                  </p>
                  <p className="text-sm text-blue-600">
                    {formatCurrency(summary.topCategory.amount)}
                  </p>
                </div>
              )}
              {summary.busiestDayOfWeek && (
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Busiest Day
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {summary.busiestDayOfWeek.day}
                  </p>
                </div>
              )}
              {summary.peakSpendingHour !== null && (
                <div>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Peak Hour
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {getHourLabel(summary.peakSpendingHour)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
