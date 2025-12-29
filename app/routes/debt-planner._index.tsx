/**
 * Debt Planner Page
 *
 * Provides debt payoff strategies and optimization recommendations
 */

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import {
  getAllDebts,
  getDebtSummary,
  compareStrategies,
  calculatePayoffPlan,
  type DebtItem,
} from "~/lib/services/debt-planner.server";
import { Sidebar } from "~/components/layout/Sidebar";
import {
  DebtSummaryCard,
  StrategyComparisonCard,
  DebtPayoffChart,
} from "~/components/debt-planner";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Get all debts
  const debts = await getAllDebts(db, user.id);

  // Get debt summary
  const summary = await getDebtSummary(db, user.id);

  // Compare strategies
  const strategyComparison = await compareStrategies(db, user.id);

  // Get avalanche plan for chart (recommended strategy)
  const avalanchePlan = await calculatePayoffPlan(db, user.id, "avalanche");

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    debts,
    summary,
    strategyComparison,
    avalanchePlan,
  };
}

export default function DebtPlannerIndexPage() {
  const { user, debts, summary, strategyComparison, avalanchePlan } =
    useLoaderData<typeof loader>();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 pt-4 lg:pt-0">
            <h1 className="text-3xl font-bold text-gray-900">Debt Planner</h1>
            <p className="mt-2 text-gray-600">
              Optimize your debt payoff strategy and become debt-free faster
            </p>
          </div>

          {debts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                You're Debt Free!
              </h2>
              <p className="text-gray-600 mb-6">
                Congratulations! You have no active debts to manage.
              </p>
            </div>
          ) : (
            <>
              {/* Debt Summary */}
              <div className="mb-8">
                <DebtSummaryCard summary={summary} currency="VND" />
              </div>

              {/* Strategy Comparison */}
              <div className="mb-8">
                <StrategyComparisonCard
                  strategies={strategyComparison.strategies}
                  recommendation={strategyComparison.recommendation}
                  currency="VND"
                />
              </div>

              {/* Payoff Projection */}
              <div className="mb-8">
                <DebtPayoffChart plan={avalanchePlan} currency="VND" />
              </div>

              {/* Debt List */}
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Debts
                </h2>
                <div className="space-y-3">
                  {debts.map((debt) => (
                    <div
                      key={debt.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {debt.type === "loan" ? "🏦" : "💳"}
                          </span>
                          <h3 className="font-semibold text-gray-900">{debt.name}</h3>
                          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
                            {debt.type === "loan" ? "Loan" : "Credit Card"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(debt.balance)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {(debt.interestRate * 100).toFixed(2)}% APR
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-semibold text-blue-900 mb-3">Debt Payoff Tips</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• <strong>Avalanche method</strong> saves the most money by targeting high-interest debt first</li>
                  <li>• <strong>Snowball method</strong> builds motivation by knocking out small debts quickly</li>
                  <li>• Consider consolidating high-interest debt into a lower-rate loan</li>
                  <li>• Even small extra payments can significantly reduce total interest paid</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
