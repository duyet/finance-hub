/**
 * Correlation Insights Card Component
 *
 * Displays top correlation insights and income-spending relationship
 */

import type { CorrelationInsights } from "~/lib/services/correlations.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react";

interface CorrelationInsightsCardProps {
  insights: CorrelationInsights;
}

export function CorrelationInsightsCard({ insights }: CorrelationInsightsCardProps) {
  const getTrendIcon = () => {
    switch (insights.incomeSpendingCorrelation.trend) {
      case "increasing":
        return <TrendingUp className="w-5 h-5 text-red-600" />;
      case "decreasing":
        return <TrendingDown className="w-5 h-5 text-green-600" />;
      default:
        return <Minus className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTrendText = () => {
    switch (insights.incomeSpendingCorrelation.trend) {
      case "increasing":
        return "Increasing";
      case "decreasing":
        return "Decreasing";
      default:
        return "Stable";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5" />
          Correlation Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Income-Spending Correlation */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Income-Spending Correlation
            </span>
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <span className="text-sm font-medium">{getTrendText()}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all"
                  style={{
                    width: `${Math.abs(insights.incomeSpendingCorrelation.correlation) * 100}%`,
                  }}
                />
              </div>
            </div>
            <span className="text-sm font-mono font-medium">
              {(insights.incomeSpendingCorrelation.correlation * 100).toFixed(0)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {insights.incomeSpendingCorrelation.correlation > 0.7
              ? "Strong correlation - spending rises with income"
              : insights.incomeSpendingCorrelation.correlation < 0.3
              ? "Weak correlation - good spending discipline"
              : "Moderate correlation between income and spending"}
          </p>
        </div>

        {/* Top Insights */}
        {insights.topInsights.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Key Findings
            </h4>
            <div className="space-y-2">
              {insights.topInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg"
                >
                  <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-900 dark:text-blue-100">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              Not enough data to generate insights. Continue tracking transactions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
