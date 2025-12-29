/**
 * Debt Payoff Chart Component
 *
 * Shows debt payoff projection over time
 */

import type { PayoffPlan } from "~/lib/services/debt-planner.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

interface DebtPayoffChartProps {
  plan: PayoffPlan;
  currency?: string;
}

export function DebtPayoffChart({ plan, currency = "VND" }: DebtPayoffChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get first 24 months or all if less
  const breakdown = plan.monthlyBreakdown.slice(0, 24);
  const maxValue = Math.max(...breakdown.map((b) => b.remainingDebt), plan.totalDebt);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debt Payoff Projection</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Starting: {formatCurrency(plan.totalDebt)}</span>
            <span>Target: {plan.debtFreeDate}</span>
          </div>

          {/* Simple bar chart using CSS */}
          <div className="space-y-1">
            {breakdown.map((month, index) => {
              const width = maxValue > 0 ? (month.remainingDebt / maxValue) * 100 : 0;
              const isPaidOff = month.remainingDebt <= 0;

              return (
                <div key={month.month} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-gray-600">Month {month.month}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isPaidOff
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${Math.max(width, 0)}%` }}
                    />
                  </div>
                  <span className="w-24 text-right font-medium">
                    {isPaidOff ? "✓ Paid off" : formatCurrency(month.remainingDebt)}
                  </span>
                </div>
              );
            })}
          </div>

          {plan.monthlyBreakdown.length > 24 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              Showing first 24 months of {plan.monthsToDebtFree} total months
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
