/**
 * Financial Health Score Card
 *
 * Displays overall financial health score with breakdown by factor.
 * Shows score category, individual factors, and recommendations.
 */

import { Card } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { CheckCircle2, AlertCircle, Info, TrendingUp, TrendingDown } from "lucide-react";
import type { FinancialHealthScore } from "~/lib/services/financial-health.server";
import {
  getScoreCategoryLabel,
  getScoreCategoryColor,
  getScoreCategoryBgColor,
} from "~/lib/utils/financial-health.utils";

interface FinancialHealthCardProps {
  health: FinancialHealthScore;
}

export function FinancialHealthCard({ health }: FinancialHealthCardProps) {
  const { score, category, factors } = health;

  return (
    <Card className={`${getScoreCategoryBgColor(category)} border-2`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Financial Health Score
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Based on your last 6 months of activity
              </p>
            </div>
            <ScoreIcon score={score} category={category} />
          </div>

          {/* Main Score Display */}
          <div className="mb-6">
            <div className="flex items-end gap-2 mb-2">
              <span className={`text-5xl font-bold ${getScoreCategoryColor(category)}`}>
                {score}
              </span>
              <span className="text-xl text-gray-500 dark:text-gray-400 mb-2">/100</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${getScoreCategoryColor(category)}`}>
                {getScoreCategoryLabel(category)}
              </span>
              <Progress value={score} className="flex-1 h-2" />
            </div>
          </div>

          {/* Factors Breakdown */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Score Breakdown
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {factors.map((factor) => (
                <FactorCard key={factor.name} factor={factor} />
              ))}
            </div>
          </div>

          {/* Recommendations */}
          {factors.some((f) => f.recommendation) && (
            <div className="mt-6 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Recommendations
                  </h5>
                  <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    {factors
                      .filter((f) => f.recommendation)
                      .map((factor) => (
                        <li key={factor.name} className="flex items-start gap-2">
                          <span className="text-gray-400">•</span>
                          <span>
                            <strong className="text-gray-700 dark:text-gray-300">{factor.name}:</strong>{" "}
                            {factor.recommendation}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>
  );
}

/**
 * Score icon based on category
 */
function ScoreIcon({ score: _score, category }: { score: number; category: FinancialHealthScore["category"] }) {
  if (category === "excellent" || category === "good") {
    return <CheckCircle2 className={`w-8 h-8 ${getScoreCategoryColor(category)}`} />;
  }
  if (category === "critical") {
    return <AlertCircle className={`w-8 h-8 ${getScoreCategoryColor(category)}`} />;
  }
  return <Info className={`w-8 h-8 ${getScoreCategoryColor(category)}`} />;
}

/**
 * Individual factor card
 */
function FactorCard({ factor }: { factor: FinancialHealthScore["factors"][number] }) {
  const isPositive = factor.score >= 70;
  const isNeutral = factor.score >= 40 && factor.score < 70;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`p-3 rounded-lg border transition-colors ${
              isPositive
                ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                : isNeutral
                  ? "bg-white dark:bg-gray-900 border-yellow-200 dark:border-yellow-900"
                  : "bg-white dark:bg-gray-900 border-red-200 dark:border-red-900"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {factor.name}
              </span>
              <div className="flex items-center gap-1">
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                ) : !isNeutral ? (
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                ) : null}
                <span
                  className={`text-sm font-bold ${
                    isPositive
                      ? "text-green-600 dark:text-green-400"
                      : isNeutral
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {factor.score}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {factor.description}
            </p>
            <Progress value={factor.score} className="h-1.5" />
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Weight: {(factor.weight * 100).toFixed(0)}%
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">{factor.description}</p>
          {factor.recommendation && (
            <p className="text-xs mt-1 text-gray-600 dark:text-gray-400">
              💡 {factor.recommendation}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Skeleton loader for health card
 */
export function FinancialHealthCardSkeleton() {
  return (
    <Card className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-2">
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-20 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </Card>
  );
}
