/**
 * Anomaly Insights Card Component
 *
 * Displays summary of detected anomalies and trends
 */

import type { AnomalyInsight } from "~/lib/services/anomaly-detection.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AlertTriangle, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";

interface AnomalyInsightsCardProps {
  insights: AnomalyInsight;
  currency?: string;
  onRunAnalysis?: () => void;
}

export function AnomalyInsightsCard({
  insights,
  currency = "VND",
  onRunAnalysis,
}: AnomalyInsightsCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = () => {
    switch (insights.recentTrend) {
      case "increasing":
        return <TrendingUp className="w-4 h-4 text-red-600" />;
      case "decreasing":
        return <TrendingDown className="w-4 h-4 text-green-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    switch (insights.recentTrend) {
      case "increasing":
        return "text-red-600";
      case "decreasing":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Anomaly Detection Insights
          </span>
          {onRunAnalysis && (
            <button
              type="button"
              onClick={onRunAnalysis}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Run Analysis
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Anomalies */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Anomalies</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {insights.totalAnomalies}
            </p>
            {insights.unresolvedCount > 0 && (
              <p className="text-xs text-amber-600">{insights.unresolvedCount} unresolved</p>
            )}
          </div>

          {/* Total Anomalous Amount */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Anomalous Amount</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {formatCurrency(insights.totalAnomalousAmount)}
            </p>
          </div>

          {/* Average Score */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Anomaly Score</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {insights.averageAnomalyScore.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500">out of 100</p>
          </div>

          {/* Trend */}
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Recent Trend</p>
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <p className={`text-lg font-semibold capitalize ${getTrendColor()}`}>
                {insights.recentTrend}
              </p>
            </div>
          </div>
        </div>

        {/* Top Categories */}
        {insights.topAnomalyCategories.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Top Anomaly Categories
            </p>
            <div className="space-y-2">
              {insights.topAnomalyCategories.map((cat) => (
                <div
                  key={cat.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-600 dark:text-gray-400">{cat.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(cat.amount)}
                    </span>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {cat.count} {cat.count === 1 ? "anomaly" : "anomalies"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500">
            Last analysis: {new Date(insights.lastAnalysisDate).toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
