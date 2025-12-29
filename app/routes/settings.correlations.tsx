/**
 * Correlations Analysis Settings Page
 *
 * Analyze relationships between spending patterns, timing, and categories
 */

import type { LoaderFunctionArgs } from "react-router";
import { json } from "react-router";
import { requireUser } from "~/lib/services/auth.server";
import { getDb } from "~/lib/db";
import { getCorrelationInsights } from "~/lib/services/correlations.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { CorrelationInsightsCard } from "~/components/correlations";
import { CorrelationMatrixCard } from "~/components/correlations";
import { TimingPatternsCard } from "~/components/correlations";
import { Network } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const db = getDb();

  const insights = await getCorrelationInsights(db, user.id, 6);

  return json({ insights });
}

export default function CorrelationsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Network className="w-8 h-8" />
              Correlations Analysis
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Discover patterns and relationships in your financial behavior
            </p>
          </div>

          <CorrelationsPageContent />
        </div>
      </main>
    </div>
  );
}

function CorrelationsPageContent() {
  const { insights } = JSON.parse(
    document.getElementById("__loader_data")?.textContent || "{}"
  );

  return (
    <div className="space-y-6">
      {/* Insights Card */}
      <CorrelationInsightsCard insights={insights} />

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Correlation Matrix */}
        <CorrelationMatrixCard correlations={insights.categoryCorrelations} />

        {/* Timing Patterns */}
        <TimingPatternsCard
          dayOfWeek={insights.timingPatterns.dayOfWeek}
          monthly={insights.timingPatterns.monthly}
          seasonal={insights.timingPatterns.seasonal}
        />
      </div>

      {/* How It Works */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Understanding Correlations
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Positive Correlation (+)
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Categories that increase together. When one goes up, the other tends to go up.
              This suggests complementary spending or shared budget allocation.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Negative Correlation (-)
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Categories that move in opposite directions. When one increases, the other
              decreases. This suggests substitution effects or trade-offs in spending.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Timing Patterns
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Repeating patterns based on day of week, month, or season. Helps identify
              recurring expenses and plan for predictable spending spikes.
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Tip:</strong> Use these insights to optimize your budget. If categories are
            strongly correlated, consider reviewing them together. Look for substitution patterns
            that indicate trade-offs you're already making.
          </p>
        </div>
      </div>
    </div>
  );
}
