/**
 * Cash Flow Alerts Card Component
 *
 * Displays alerts for predicted low balance scenarios
 */

import type { CashFlowAlert } from "~/lib/services/cash-flow.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";

interface CashFlowAlertsCardProps {
  alerts: CashFlowAlert[];
  currency?: string;
  onResolve?: (alertId: string) => void;
}

export function CashFlowAlertsCard({ alerts, currency = "VND", onResolve }: CashFlowAlertsCardProps) {
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
      year: "numeric",
    });
  };

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Cash Flow Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-gray-100 font-medium">No alerts</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your cash flow looks healthy for the forecast period
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Critical Alerts */}
            {criticalAlerts.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-600 mb-3">Critical</p>
                <div className="space-y-2">
                  {criticalAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              Low balance predicted
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              On {formatDate(alert.alertDate)}, your balance is predicted to drop to{" "}
                              <span className="font-semibold text-red-600">
                                {formatCurrency(alert.predictedBalance)}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Threshold: {formatCurrency(alert.threshold)}
                            </p>
                          </div>
                        </div>
                        {!alert.isResolved && onResolve && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onResolve(alert.id)}
                            className="flex-shrink-0"
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warning Alerts */}
            {warningAlerts.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-amber-600 mb-3">Warnings</p>
                <div className="space-y-2">
                  {warningAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-4 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              Balance running low
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              On {formatDate(alert.alertDate)}, your balance is predicted to be{" "}
                              <span className="font-semibold text-amber-600">
                                {formatCurrency(alert.predictedBalance)}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Threshold: {formatCurrency(alert.threshold)}
                            </p>
                          </div>
                        </div>
                        {!alert.isResolved && onResolve && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onResolve(alert.id)}
                            className="flex-shrink-0"
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        {alerts.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              What you can do
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li>• Review and pause non-essential recurring expenses</li>
              <li>• Consider timing large purchases for after high-income periods</li>
              <li>• Look for ways to increase income or reduce expenses</li>
              <li>• Set up a buffer fund to cover unexpected shortfalls</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
