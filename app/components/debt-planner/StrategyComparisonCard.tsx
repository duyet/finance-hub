/**
 * Strategy Comparison Card Component
 *
 * Compares debt payoff strategies (snowball vs avalanche)
 */

import type { PayoffStrategy } from "~/lib/services/debt-planner.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Target, TrendingDown, TrendingUp, Award } from "lucide-react";

interface StrategyComparisonCardProps {
  strategies: Record<PayoffStrategy, {
    monthsToDebtFree: number;
    totalInterestPaid: number;
    debtFreeDate: string;
  }>;
  recommendation: {
    strategy: PayoffStrategy;
    reason: string;
  };
  currency?: string;
}

const STRATEGY_INFO = {
  snowball: {
    name: "Snowball",
    description: "Pay off smallest balances first",
    icon: "❄️",
    color: "blue",
  },
  avalanche: {
    name: "Avalanche",
    description: "Pay off highest interest rates first",
    icon: "🏔️",
    color: "purple",
  },
  highest_balance: {
    name: "Highest Balance",
    description: "Pay off largest balances first",
    icon: "🏔️",
    color: "orange",
  },
};

export function StrategyComparisonCard({
  strategies,
  recommendation,
  currency = "VND",
}: StrategyComparisonCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Payoff Strategies
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Recommendation */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-green-900">Recommended: {STRATEGY_INFO[recommendation.strategy].name}</h3>
          </div>
          <p className="text-sm text-green-700">{recommendation.reason}</p>
        </div>

        {/* Strategy Comparison */}
        <div className="space-y-4">
          {(Object.keys(strategies) as PayoffStrategy[]).map((strategyKey) => {
            const strategy = strategies[strategyKey];
            const info = STRATEGY_INFO[strategyKey];
            const isRecommended = strategyKey === recommendation.strategy;

            return (
              <div
                key={strategyKey}
                className={`p-4 rounded-lg border ${
                  isRecommended
                    ? "bg-green-50 border-green-300"
                    : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <h4 className={`font-semibold ${isRecommended ? "text-green-900" : "text-gray-900"}`}>
                        {info.name}
                      </h4>
                      <p className="text-xs text-gray-600">{info.description}</p>
                    </div>
                  </div>
                  {isRecommended && (
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Time to Debt Free</p>
                    <p className={`font-semibold ${isRecommended ? "text-green-700" : "text-gray-900"}`}>
                      {strategy.monthsToDebtFree} months
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Interest</p>
                    <p className={`font-semibold ${isRecommended ? "text-green-700" : "text-gray-900"}`}>
                      {formatCurrency(strategy.totalInterestPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Debt Free Date</p>
                    <p className={`font-semibold ${isRecommended ? "text-green-700" : "text-gray-900"}`}>
                      {formatDate(strategy.debtFreeDate)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
