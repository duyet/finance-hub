/**
 * Spending Insights Page
 *
 * View spending patterns with heatmaps and analytics
 */

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import {
  getAllSpendingInsights,
  getCompleteDailyHeatmap,
} from "~/lib/services/spending-insights.server";
import { Sidebar } from "~/components/layout/Sidebar";
import {
  InsightsSummaryCard,
  DailyHeatmapCalendar,
  CategoryHeatmapCard,
  DayOfWeekHeatmapCard,
  MonthlyPatternChart,
  HourlyPatternChart,
} from "~/components/spending-insights";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Get all insights data (90-day period)
  const insights = await getAllSpendingInsights(db, user.id, 90);

  // Get complete yearly heatmap
  const currentYear = new Date().getFullYear();
  const yearlyHeatmap = await getCompleteDailyHeatmap(db, user.id, currentYear);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    summary: insights.summary,
    dailyHeatmap: insights.dailyHeatmap,
    yearlyHeatmap,
    dayOfWeek: insights.dayOfWeek,
    monthly: insights.monthly,
    categories: insights.categories,
    hourly: insights.hourly,
    currentYear,
  };
}

export default function SpendingInsightsPage() {
  const {
    user,
    summary,
    yearlyHeatmap,
    dayOfWeek,
    monthly,
    categories,
    hourly,
    currentYear,
  } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 pt-4 lg:pt-0">
            <h1 className="text-3xl font-bold text-gray-900">Spending Insights</h1>
            <p className="mt-2 text-gray-600">
              Visualize your spending patterns and trends
            </p>
          </div>

          {/* Summary Card */}
          <div className="mb-8">
            <InsightsSummaryCard summary={summary} />
          </div>

          {/* Yearly Heatmap */}
          <div className="mb-8">
            <DailyHeatmapCalendar data={yearlyHeatmap} year={currentYear} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Category Heatmap */}
            <div>
              <CategoryHeatmapCard data={categories} />
            </div>

            {/* Day of Week Heatmap */}
            <div>
              <DayOfWeekHeatmapCard data={dayOfWeek} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Patterns */}
            <div>
              <MonthlyPatternChart data={monthly} />
            </div>

            {/* Hourly Patterns */}
            <div>
              <HourlyPatternChart data={hourly} />
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Understanding Your Spending Patterns
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800 dark:text-blue-200">
              <div>
                <p className="font-medium mb-1">Daily Heatmap</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Darker green squares indicate higher spending days. Use this to identify recurring high-spend periods.
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">Category Analysis</p>
                <p className="text-blue-700 dark:text-blue-300">
                  See which categories consume most of your budget. Categories with red bars represent 30%+ of total spending.
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">Time Patterns</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Day of week and hourly patterns reveal when you're most likely to spend, helping you plan and budget accordingly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
