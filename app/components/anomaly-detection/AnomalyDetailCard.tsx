/**
 * Anomaly Detail Card Component
*
* Displays detailed breakdown of a single anomaly
*/

import type { SpendingAnomaly } from "~/lib/services/anomaly-detection.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { AlertOctagon, AlertCircle, AlertTriangle, Info } from "lucide-react";

interface AnomalyDetailCardProps {
  anomaly: SpendingAnomaly;
  currency?: string;
}

export function AnomalyDetailCard({ anomaly, currency = "VND" }: AnomalyDetailCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSeverityIcon = () => {
    switch (anomaly.severity) {
      case "critical":
        return <AlertOctagon className="w-6 h-6 text-red-600" />;
      case "high":
        return <AlertCircle className="w-6 h-6 text-orange-600" />;
      case "medium":
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
      default:
        return <Info className="w-6 h-6 text-blue-600" />;
    }
  };

  const getSeverityColor = () => {
    switch (anomaly.severity) {
      case "critical":
        return "border-red-300 dark:border-red-700";
      case "high":
        return "border-orange-300 dark:border-orange-700";
      case "medium":
        return "border-amber-300 dark:border-amber-700";
      default:
        return "border-blue-300 dark:border-blue-700";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-red-600";
    if (score >= 60) return "text-orange-600";
    if (score >= 40) return "text-amber-600";
    return "text-blue-600";
  };

  return (
    <Card className={`border-2 ${getSeverityColor()}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {getSeverityIcon()}
          <span>
            {anomaly.category} Anomaly - {anomaly.severity.toUpperCase()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Amount Details */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Amount Analysis
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Actual Amount</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatCurrency(anomaly.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Expected Amount</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {formatCurrency(anomaly.expectedAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Deviation</span>
                <span className={`font-medium ${
                  anomaly.deviationPercent > 0 ? "text-red-600" : "text-green-600"
                }`}>
                  {anomaly.deviationPercent > 0 ? "+" : ""}{anomaly.deviationPercent.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Z-Score</span>
                <span className={`font-medium ${
                  Math.abs(anomaly.zScore) >= 3 ? "text-red-600" : "text-amber-600"
                }`}>
                  {anomaly.zScore.toFixed(2)}σ
                </span>
              </div>
            </div>
          </div>

          {/* Anomaly Score */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Anomaly Score
            </h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold">
                <span className={getScoreColor(anomaly.anomalyScore)}>
                  {anomaly.anomalyScore.toFixed(0)}
                </span>
                <span className="text-lg text-gray-500">/100</span>
              </div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      anomaly.anomalyScore >= 80 ? "bg-red-600" :
                      anomaly.anomalyScore >= 60 ? "bg-orange-600" :
                      anomaly.anomalyScore >= 40 ? "bg-amber-600" :
                      "bg-blue-600"
                    }`}
                    style={{ width: `${anomaly.anomalyScore}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {anomaly.anomalyScore >= 80 ? "Critical deviation" :
               anomaly.anomalyScore >= 60 ? "Highly unusual" :
               anomaly.anomalyScore >= 40 ? "Moderately unusual" :
               "Slightly unusual"}
            </p>
          </div>
        </div>

        {/* Reasons */}
        {anomaly.reasons.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Detection Reasons
            </h3>
            <ul className="space-y-2">
              {anomaly.reasons.map((reason, idx) => (
                <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-amber-600">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metadata */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
            <div>
              <span className="block">Transaction Date</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {new Date(anomaly.anomalyDate).toLocaleString()}
              </span>
            </div>
            <div>
              <span className="block">Detected On</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {new Date(anomaly.createdAt).toLocaleString()}
              </span>
            </div>
            {anomaly.isReviewed && (
              <div>
                <span className="block">Reviewed On</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {anomaly.reviewedAt ? new Date(anomaly.reviewedAt).toLocaleString() : "N/A"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            What you should do
          </p>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Review if this transaction was legitimate</li>
            <li>• Check for potential fraud or errors</li>
            <li>• Consider if this represents a lifestyle change</li>
            <li>• Update budgets if this is a new normal spending pattern</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
