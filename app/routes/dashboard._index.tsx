/**
 * Dashboard Index Route
 *
 * Main dashboard showing financial overview with:
 * - Net worth display
 * - Runway calculation
 * - Income vs expenses chart
 * - Expense breakdown pie chart
 * - Recent transactions table
 * - Quick action buttons
 */

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { useState, lazy, Suspense } from "react";
import { requireAuth } from "../lib/auth/session.server";
import { getDashboardData } from "../lib/db/transactions.server";
import { getUnpaidStatements } from "~/lib/db/credit-cards.server";
import { getDb } from "~/lib/auth/db.server";
import { Sidebar } from "~/components/layout/Sidebar";
import {
  NetWorthCard,
  RunwayCard,
  RecentTransactionsTable,
  QuickActions,
} from "~/components/dashboard";
import { PaymentDueAlert } from "~/components/dashboard/PaymentDueAlert";
import { FinancialInsightsChat, QuickInsightQuestions } from "~/components/ai/FinancialInsightsChat";
import { FinancialHealthCard } from "~/components/dashboard/FinancialHealthCard";
import { ChartSkeleton } from "~/components/ui/skeleton";
import { calculateFinancialHealthScore } from "~/lib/services/financial-health.server";

/**
 * Database row types for AI context queries
 */
interface CategoryRow {
  id: string;
  name: string;
}

interface TransactionRow {
  date: string;
  amount: number;
  description: string;
  category_id: string | null;
}

interface AccountRow {
  name: string;
  type: string;
  balance: number;
}

// Lazy load chart components to defer recharts loading (425KB)
const IncomeExpenseChart = lazy(() =>
  import("~/components/dashboard/IncomeExpenseChart").then(m => ({ default: m.IncomeExpenseChart }))
);
const ExpenseBreakdownChart = lazy(() =>
  import("~/components/dashboard/ExpenseBreakdownChart").then(m => ({ default: m.ExpenseBreakdownChart }))
);

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Get dashboard data
  const dashboardData = await getDashboardData(request, user.id, 12);

  // Get unpaid credit card statements for alerts
  const unpaidStatements = await getUnpaidStatements(request, user.id);

  // Calculate financial health score
  const healthScore = await calculateFinancialHealthScore(db, user.id);

  // Get recent transactions for AI context
  const recentTransactionsResult = await db
    .prepare(
      `SELECT date, amount, description, category_id
       FROM transactions
       WHERE user_id = ? AND status = 'POSTED'
       ORDER BY date DESC
       LIMIT 10`
    )
    .bind(user.id)
    .all();

  // Get accounts for AI context
  const accountsResult = await db
    .prepare(
      `SELECT name, type, balance
       FROM financial_accounts
       WHERE user_id = ? AND is_archived = 0
       ORDER BY name`
    )
    .bind(user.id)
    .all();

  // Get category names
  const categoriesResult = await db
    .prepare(`SELECT id, name FROM categories WHERE user_id = ?`)
    .bind(user.id)
    .all();

  const categories = categoriesResult.results || [];
  const categoryMap = new Map(categories.map((c: CategoryRow) => [c.id, c.name]));

  // Enrich transactions with category names
  const aiContextTransactions = (recentTransactionsResult.results || []).map((t: TransactionRow) => ({
    date: t.date,
    amount: t.amount,
    description: t.description,
    category: categoryMap.get(t.category_id) || "Uncategorized",
  }));

  const aiContextAccounts = (accountsResult.results || []).map((a: AccountRow) => ({
    name: a.name,
    type: a.type,
    balance: a.balance,
  }));

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    dashboard: dashboardData,
    unpaidStatements,
    healthScore,
    aiContext: {
      recentTransactions: aiContextTransactions,
      accounts: aiContextAccounts,
    },
  };
}

export default function DashboardPage() {
  const { user, dashboard, unpaidStatements, healthScore, aiContext } = useLoaderData<typeof loader>();
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);

  // Filter transactions by selected month
  const filteredTransactions = selectedMonth
    ? dashboard.recentTransactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date);
        const [year, month] = selectedMonth.split("-");
        return (
          transactionDate.getFullYear() === parseInt(year) &&
          transactionDate.getMonth() === parseInt(month) - 1
        );
      })
    : dashboard.recentTransactions;

  // Handle bar click from chart
  const handleBarClick = (month: string) => {
    setSelectedMonth(month);
  };

  // Clear month filter
  const clearFilter = () => {
    setSelectedMonth(null);
  };

  // Format month for display
  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    return `${month}/${year}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar user={user} />

      {/* Main content */}
      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 pt-4 lg:pt-0">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user.name || user.email}!
            </h1>
            <p className="mt-2 text-gray-600">
              Here's your financial overview for this month.
            </p>
          </div>

          {/* Payment Due Alert */}
          {unpaidStatements && unpaidStatements.length > 0 && (
            <div className="mb-8">
              <PaymentDueAlert unpaidStatements={unpaidStatements} />
            </div>
          )}

          {/* Net Worth and Runway Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <NetWorthCard
              netWorth={dashboard.netWorth}
              currency="VND"
            />
            <RunwayCard
              months={dashboard.runway.months}
              health={dashboard.runway.health}
            />
          </div>

          {/* Financial Health Score Card */}
          <div className="mb-8">
            <FinancialHealthCard health={healthScore} />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Income</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">
                    +{new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                      minimumFractionDigits: 0,
                    }).format(dashboard.summary.totalIncome)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Expenses</p>
                  <p className="text-2xl font-bold text-red-600 mt-1">
                    -{new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                      minimumFractionDigits: 0,
                    }).format(dashboard.summary.totalExpenses)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 17h8m0 0V9m0 8l-8-8-4 4-6 6"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Net Flow</p>
                  <p
                    className={`text-2xl font-bold mt-1 ${
                      dashboard.summary.netFlow >= 0
                        ? "text-blue-600"
                        : "text-red-600"
                    }`}
                  >
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                      minimumFractionDigits: 0,
                      signDisplay: "always",
                    }).format(dashboard.summary.netFlow)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Suspense fallback={<ChartSkeleton />}>
              <IncomeExpenseChart
                data={dashboard.incomeVsExpense}
                currency="VND"
                onBarClick={handleBarClick}
              />
            </Suspense>
            <Suspense fallback={<ChartSkeleton />}>
              <ExpenseBreakdownChart
                data={dashboard.expenseByCategory}
                currency="VND"
              />
            </Suspense>
          </div>

          {/* AI Financial Insights */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              AI Financial Insights
            </h2>
            <FinancialInsightsChat
              userId={user.id}
              initialContext={aiContext}
            />
          </div>

          {/* Recent Transactions */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedMonth
                    ? `Transactions for ${formatMonthDisplay(selectedMonth)}`
                    : "Recent Transactions"}
                </h2>
                {selectedMonth && (
                  <p className="text-sm text-gray-500 mt-1">
                    Showing {filteredTransactions.length} of {dashboard.recentTransactions.length} transactions
                  </p>
                )}
              </div>
              {selectedMonth && (
                <button
                  onClick={clearFilter}
                  className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  Clear Filter
                </button>
              )}
            </div>
            <RecentTransactionsTable
              transactions={filteredTransactions}
              currency="VND"
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <QuickActions />
          </div>
        </div>
      </main>
    </div>
  );
}
