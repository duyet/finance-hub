/**
 * Budgets Page
 *
 * Centralized budget management with progress visualization
 */

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import { getBudgets, getBudgetSummary, type BudgetData } from "~/lib/services/budgets.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { BudgetProgressCard, BudgetSummaryCard } from "~/components/budgets";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { AlertCircle, CheckCircle, TrendingUp, Filter } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Get all budgets with spending data
  const budgets = await getBudgets(db, user.id);

  // Get budget summary
  const summary = await getBudgetSummary(db, user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    budgets,
    summary,
  };
}

type BudgetFilter = "all" | "healthy" | "warning" | "critical" | "exceeded";

export default function BudgetsIndexPage() {
  const { user, budgets, summary } = useLoaderData<typeof loader>();
  const [filter, setFilter] = useState<BudgetFilter>("all");

  // Filter budgets based on selected status
  const filteredBudgets = budgets.filter((budget) => {
    if (filter === "all") return true;
    return budget.status === filter;
  });

  // Group budgets by status
  const exceededBudgets = budgets.filter((b) => b.status === "exceeded");
  const criticalBudgets = budgets.filter((b) => b.status === "critical");
  const warningBudgets = budgets.filter((b) => b.status === "warning");

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 pt-4 lg:pt-0">
            <h1 className="text-3xl font-bold text-gray-900">Budgets</h1>
            <p className="mt-2 text-gray-600">
              Track and manage your monthly spending budgets by category
            </p>
          </div>

          {/* Alert Summary */}
          {(exceededBudgets.length > 0 || criticalBudgets.length > 0 || warningBudgets.length > 0) && (
            <Card className={`mb-8 ${
              exceededBudgets.length > 0 ? "bg-red-50 border-red-200" :
              criticalBudgets.length > 0 ? "bg-orange-50 border-orange-200" :
              "bg-yellow-50 border-yellow-200"
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {exceededBudgets.length > 0 ? (
                    <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                  ) : criticalBudgets.length > 0 ? (
                    <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                  )}
                  <div className="flex-1">
                    <h3 className={`font-semibold mb-1 ${
                      exceededBudgets.length > 0 ? "text-red-900" :
                      criticalBudgets.length > 0 ? "text-orange-900" :
                      "text-yellow-900"
                    }`}>
                      {exceededBudgets.length > 0
                        ? `${exceededBudgets.length} budget${exceededBudgets.length > 1 ? "s have" : " has"} exceeded limits`
                        : `${criticalBudgets.length + warningBudgets.length} budget${criticalBudgets.length + warningBudgets.length > 1 ? "s are" : " is"} at risk`}
                    </h3>
                    <p className={`text-sm ${
                      exceededBudgets.length > 0 ? "text-red-700" :
                      criticalBudgets.length > 0 ? "text-orange-700" :
                      "text-yellow-700"
                    }`}>
                      {exceededBudgets.length > 0 && (
                        <>Review your spending in {exceededBudgets.map((b) => b.name).join(", ")} immediately. </>
                      )}
                      {criticalBudgets.length > 0 && warningBudgets.length > 0 && (
                        <>Consider reducing spending to stay within budget limits.</>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget Summary Card */}
          <div className="mb-8">
            <BudgetSummaryCard summary={summary} currency="VND" />
          </div>

          {/* Filters */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900">
                Category Budgets ({filteredBudgets.length})
              </h2>
            </div>
            <Select value={filter} onValueChange={(value) => setFilter(value as BudgetFilter)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Budgets</SelectItem>
                <SelectItem value="healthy">✓ Healthy</SelectItem>
                <SelectItem value="warning">⚠️ Warning</SelectItem>
                <SelectItem value="critical">🔥 Critical</SelectItem>
                <SelectItem value="exceeded">🚨 Exceeded</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Budgets Grid */}
          {filteredBudgets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBudgets.map((budget) => (
                <BudgetProgressCard
                  key={budget.id}
                  budget={budget}
                  currency="VND"
                  onClick={() => (window.location.href = `/categories/${budget.id}`)}
                />
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {filter === "all" ? "No budgets set" : `No ${filter} budgets`}
                </h3>
                <p className="text-gray-600 mb-4">
                  {filter === "all"
                    ? "Set monthly spending limits on your expense categories to track budgets here."
                    : `All your budgets are in good shape!`}
                </p>
                {filter === "all" && (
                  <button
                    onClick={() => (window.location.href = "/categories")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Budget
                  </button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tips Section */}
          <Card className="mt-8 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Budget Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800 space-y-2">
              <p>
                <strong>Set realistic limits:</strong> Review your past spending to set achievable budget limits.
              </p>
              <p>
                <strong>Track regularly:</strong> Check your budget progress weekly to stay on track.
              </p>
              <p>
                <strong>Adjust as needed:</strong> Budgets can be modified anytime as your circumstances change.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
