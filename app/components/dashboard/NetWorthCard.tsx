/**
 * NetWorthCard Component
 *
 * Displays the user's net worth with trend indicator
 * Net worth = Total assets - Total liabilities
 */

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useI18n } from "~/lib/i18n/client";

interface NetWorthCardProps {
  netWorth: number;
  previousNetWorth?: number;
  currency?: string;
}

export function NetWorthCard({
  netWorth,
  previousNetWorth,
  currency = "VND",
}: NetWorthCardProps) {
  const { formatCurrency } = useI18n();

  // Calculate trend
  const trend = previousNetWorth
    ? netWorth - previousNetWorth
    : undefined;
  const trendPercentage = previousNetWorth
    ? ((trend! / previousNetWorth) * 100).toFixed(2)
    : undefined;

  // Determine trend icon and color
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const trendColor =
    trend && trend > 0
      ? "text-green-600"
      : trend && trend < 0
      ? "text-red-600"
      : "text-gray-500";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Net Worth
        </CardTitle>
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatCurrency(netWorth, currency)}</div>
        {trend !== undefined && (
          <div className={`flex items-center text-xs ${trendColor} mt-1`}>
            <TrendIcon className="w-3 h-3 mr-1" />
            <span>
              {trend > 0 ? "+" : ""}
              {formatCurrency(trend, currency)} ({trendPercentage}%)
            </span>
            <span className="text-gray-500 ml-1">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
