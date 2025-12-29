/**
 * Anomaly List Card Component
 *
 * Displays list of detected anomalies with severity indicators
 */

import type { SpendingAnomaly } from "~/lib/services/anomaly-detection.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { AlertTriangle, CheckCircle2, AlertCircle, AlertOctagon } from "lucide-react";

interface AnomalyListCardProps {
  anomalies: SpendingAnomaly[];
  currency?: string;
  onMarkReviewed?: (anomalyId: string) => void;
}

export function AnomalyListCard({
  anomalies,
  currency = "VND",
  onMarkReviewed,
}: AnomalyListCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertOctagon className="w-5 h-5 text-red-600" />;
      case "high":
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case "medium":
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
      case "high":
        return "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800";
      case "medium":
        return "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800";
      default:
        return "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800";
    }
  };

  const getSeverityLabel = (severity: string) => {
    const labels: Record<string, string> = {
      critical: "Critical",
      high: "High",
      medium: "Medium",
      low: "Low",
    };
    return labels[severity] || severity;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Detected Anomalies
        </CardTitle>
      </CardHeader>
      <CardContent>
        {anomalies.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-gray-100 font-medium">No anomalies detected</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your spending patterns appear normal
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((anomaly) => (
              <div
                key={anomaly.id}
                className={`p-4 border rounded-lg ${getSeverityColor(anomaly.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getSeverityIcon(anomaly.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {anomaly.category}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          anomaly.severity === "critical" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" :
                          anomaly.severity === "high" ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" :
                          anomaly.severity === "medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" :
                          "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                        }`}>
                          {getSeverityLabel(anomaly.severity)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(anomaly.anomalyDate).toLocaleDateString()}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">Amount</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(anomaly.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Expected</p>
                          <p className="font-medium text-gray-700 dark:text-gray-300">
                            {formatCurrency(anomaly.expectedAmount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Deviation</p>
                          <p className={`font-medium ${
                            anomaly.deviationPercent > 0 ? "text-red-600" : "text-green-600"
                          }`}>
                            {anomaly.deviationPercent > 0 ? "+" : ""}{anomaly.deviationPercent.toFixed(0)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Anomaly Score</p>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {anomaly.anomalyScore.toFixed(0)}/100
                          </p>
                        </div>
                      </div>
                      {anomaly.reasons.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Reasons:</p>
                          <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                            {anomaly.reasons.map((reason, idx) => (
                              <li key={idx}>• {reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  {!anomaly.isReviewed && onMarkReviewed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onMarkReviewed(anomaly.id)}
                      className="flex-shrink-0"
                    >
                      Mark Reviewed
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
