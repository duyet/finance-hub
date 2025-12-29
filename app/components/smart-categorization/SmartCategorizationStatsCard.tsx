/**
 * Smart Categorization Stats Card Component
 *
 * Displays auto-categorization statistics and top uncategorized items
 */

import type { CategorizationStats } from "~/lib/services/smart-categorization.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Sparkles, ListX } from "lucide-react";

interface SmartCategorizationStatsCardProps {
  stats: CategorizationStats;
  currency?: string;
  onAutoCategorize?: () => void;
}

export function SmartCategorizationStatsCard({
  stats,
  currency = "VND",
  onAutoCategorize,
}: SmartCategorizationStatsCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const uncategorizedCount = stats.totalTransactions - stats.categorizedCount;
  const categorizationRate = stats.totalTransactions > 0
    ? (stats.categorizedCount / stats.totalTransactions) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Smart Categorization
          </span>
          {onAutoCategorize && uncategorizedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAutoCategorize}
            >
              Auto-Categorize ({uncategorizedCount})
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.totalTransactions}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Categorized</p>
            <p className="text-2xl font-bold text-green-600">
              {stats.categorizedCount}
            </p>
            <p className="text-xs text-gray-500">
              {categorizationRate.toFixed(1)}% rate
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Auto-Categorized</p>
            <p className="text-2xl font-bold text-blue-600">
              {stats.autoCategorizedCount}
            </p>
            <p className="text-xs text-gray-500">
              {stats.autoCategorizationRate.toFixed(1)}% of total
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Accuracy</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats.accuracy.toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Top Uncategorized */}
        {stats.topUncategorized.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <ListX className="w-4 h-4" />
              Top Uncategorized Descriptions
            </p>
            <div className="space-y-2">
              {stats.topUncategorized.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <span className="flex-1 truncate" title={item.description}>
                    {item.description}
                  </span>
                  <div className="flex items-center gap-3 ml-3">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(item.amount)}
                    </span>
                    <span className="text-xs text-gray-500 w-16 text-right">
                      {item.count}x
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        {uncategorizedCount === 0 ? (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✓ All transactions are categorized! Great job keeping your finances organized.
            </p>
          </div>
        ) : (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Tip:</strong> Regularly categorizing transactions trains the system
              to automatically categorize similar transactions in the future.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
