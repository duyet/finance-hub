/**
 * Correlation Matrix Card Component
 *
 * Displays heatmap of category correlations
 */

import type { CategoryCorrelation } from "~/lib/services/correlations.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

interface CorrelationMatrixCardProps {
  correlations: CategoryCorrelation[];
}

export function CorrelationMatrixCard({ correlations }: CorrelationMatrixCardProps) {
  const getCorrelationColor = (correlation: number): string => {
    const abs = Math.abs(correlation);
    if (correlation > 0) {
      // Positive correlation - shades of blue
      const intensity = Math.min(abs, 1);
      return `rgba(59, 130, 246, ${0.2 + intensity * 0.8})`;
    } else {
      // Negative correlation - shades of red
      const intensity = Math.min(abs, 1);
      return `rgba(239, 68, 68, ${0.2 + intensity * 0.8})`;
    }
  };

  const getCorrelationBadge = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs > 0.8) {
      return <Badge className="bg-purple-600">Very Strong</Badge>;
    } else if (abs > 0.6) {
      return <Badge className="bg-blue-600">Strong</Badge>;
    } else if (abs > 0.4) {
      return <Badge variant="secondary">Moderate</Badge>;
    } else {
      return <Badge variant="outline">Weak</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Correlations</CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          How spending categories move together
        </p>
      </CardHeader>
      <CardContent>
        {correlations.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">Not enough data for correlation analysis.</p>
            <p className="text-xs mt-1">
              Continue categorizing transactions to reveal patterns.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {correlations.slice(0, 10).map((corr, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-3 rounded-lg border-2 transition-colors"
                style={{
                  backgroundColor: getCorrelationColor(corr.correlation),
                  borderColor: getCorrelationColor(corr.correlation),
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {corr.category1}
                    </span>
                    <span className="text-gray-500">↔</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {corr.category2}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getCorrelationBadge(corr.correlation)}
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {corr.sampleSize} months
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono">
                    {(corr.correlation * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    {corr.correlation > 0 ? "move together" : "substitute"}
                  </div>
                </div>
              </div>
            ))}

            {correlations.length > 10 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                Showing top 10 of {correlations.length} correlations
              </p>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Correlation strength:</p>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span>Negative (substitute)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-gray-300 dark:bg-gray-600" />
              <span>None</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-blue-500" />
              <span>Positive (move together)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
