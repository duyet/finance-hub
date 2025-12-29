/**
 * Timing Patterns Card Component
 *
 * Displays timing patterns in spending (day of week, monthly, seasonal)
 */

import type { TimingPattern } from "~/lib/services/correlations.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";

interface TimingPatternsCardProps {
  dayOfWeek: TimingPattern[];
  monthly: TimingPattern[];
  seasonal: TimingPattern[];
}

export function TimingPatternsCard({
  dayOfWeek,
  monthly,
  seasonal,
}: TimingPatternsCardProps) {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const seasonNames = ["Winter", "Spring", "Summer", "Fall"];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const renderPatternBar = (
    patterns: TimingPattern[],
    labels: string[],
    title: string,
    icon: React.ReactNode
  ) => {
    const maxValue = Math.max(...patterns.map((p) => p.amount));

    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {icon}
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {title}
          </h4>
        </div>
        <div className="space-y-2">
          {patterns.map((pattern, idx) => {
            const widthPercent = maxValue > 0 ? (pattern.amount / maxValue) * 100 : 0;
            const isHighDeviation = Math.abs(pattern.deviationFromMean) > 20;

            return (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-12 text-xs text-gray-600 dark:text-gray-400 text-right">
                  {labels[pattern.periodIndex] || labels[idx]}
                </div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative">
                    <div
                      className={`h-full transition-all ${
                        isHighDeviation
                          ? "bg-blue-600 dark:bg-blue-500"
                          : "bg-gray-400 dark:bg-gray-500"
                      }`}
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
                <div className="w-24 text-right">
                  <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(pattern.amount)}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {pattern.deviationFromMean > 5 ? (
                      <TrendingUp className="w-3 h-3 text-red-500" />
                    ) : pattern.deviationFromMean < -5 ? (
                      <TrendingDown className="w-3 h-3 text-green-500" />
                    ) : null}
                    <span className="text-xs text-gray-500">
                      {pattern.deviationFromMean > 0 ? "+" : ""}
                      {pattern.deviationFromMean.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Timing Patterns
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          When spending occurs throughout time periods
        </p>
      </CardHeader>
      <CardContent>
        {dayOfWeek.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Not enough data for timing analysis.</p>
          </div>
        ) : (
          <>
            {renderPatternBar(dayOfWeek, dayNames, "Day of Week", <Calendar className="w-4 h-4" />)}

            {renderPatternBar(monthly, monthNames, "Monthly Patterns", <Calendar className="w-4 h-4" />)}

            {renderPatternBar(seasonal, seasonNames, "Seasonal Patterns", <Calendar className="w-4 h-4" />)}

            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  ±20%+
                </Badge>
                <span>= significant deviation from average</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
