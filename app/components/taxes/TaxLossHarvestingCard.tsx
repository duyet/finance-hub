/**
 * Tax Loss Harvesting Card Component
 *
 * Displays opportunities for tax loss harvesting to offset gains
 */

import type { TaxLossHarvestingOpportunity } from "~/lib/services/taxes.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { TrendingDown, AlertCircle, Calendar, Target } from "lucide-react";

interface TaxLossHarvestingCardProps {
  opportunities: TaxLossHarvestingOpportunity[];
}

export function TaxLossHarvestingCard({ opportunities }: TaxLossHarvestingCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const totalPotentialLoss = opportunities.reduce((sum, opp) => sum + Math.abs(opp.unrealizedLoss), 0);
  const harvestableCount = opportunities.filter((opp) => opp.isHarvestable).length;

  if (opportunities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Tax Loss Harvesting Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500">No tax loss harvesting opportunities found</p>
            <p className="text-sm text-gray-400 mt-2">
              Opportunities appear when you have unrealized losses above your threshold
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Tax Loss Harvesting Opportunities
          </span>
          <span className="text-sm font-normal text-gray-500">
            {harvestableCount} of {opportunities.length} harvestable
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm font-semibold text-green-900 dark:text-green-200">Potential Tax Savings</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400 mt-1">{formatCurrency(totalPotentialLoss)}</p>
          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
            Total unrealized losses that could be harvested to offset capital gains
          </p>
        </div>

        {/* Opportunities List */}
        <div className="space-y-4">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className={`p-4 rounded-lg border ${
                opp.isHarvestable
                  ? "bg-white dark:bg-gray-800 border-green-200 dark:border-green-800"
                  : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{opp.symbol}</h3>
                    {!opp.isHarvestable && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-3 h-3" />
                        {opp.reasonNotHarvestable || "Not harvestable"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <div>
                      <p className="text-xs text-gray-500">Unrealized Loss</p>
                      <p className="text-lg font-semibold text-red-600">
                        {formatCurrency(opp.unrealizedLoss)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Loss Percentage</p>
                      <p className="text-lg font-semibold text-red-600">
                        {formatPercent(opp.unrealizedLossPercent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Current Value</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(opp.currentValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {opp.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Holding: {opp.holdingPeriodDays} days
                    </span>
                    {opp.expiresAt && (
                      <span className="flex items-center gap-1">
                        <TrendingDown className="w-4 h-4" />
                        Wash sale window: {opp.expiresAt}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Tax Loss Harvesting Tips</p>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• <strong>Wash Sale Rule</strong>: Wait 30 days before repurchasing substantially identical securities</li>
            <li>• <strong>$3,000 Limit</strong>: Deduct up to $3,000 of net capital losses against ordinary income annually</li>
            <li>• <strong>Carryforward</strong>: Excess losses carry forward indefinitely to future tax years</li>
            <li>• <strong>Short-term First</strong>: Harvest short-term losses first as they offset higher-taxed gains</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
