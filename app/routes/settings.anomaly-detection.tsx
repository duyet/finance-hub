/**
 * Anomaly Detection Page
 *
 * View and manage detected spending anomalies
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useNavigation, Form } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import {
  detectSpendingAnomalies,
  getSpendingAnomalies,
  getAnomalyInsights,
  markAnomalyReviewed,
} from "~/lib/services/anomaly-detection.server";
import { Sidebar } from "~/components/layout/Sidebar";
import {
  AnomalyInsightsCard,
  AnomalyListCard,
  AnomalyDetailCard,
} from "~/components/anomaly-detection";
import type { SpendingAnomaly } from "~/lib/services/anomaly-detection.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Get insights and anomalies
  const insights = await getAnomalyInsights(db, user.id);
  const anomalies = await getSpendingAnomalies(db, user.id, false);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    insights,
    anomalies,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "run-analysis") {
    await detectSpendingAnomalies(db, user.id);
    return { success: true };
  }

  if (intent === "mark-reviewed") {
    const anomalyId = formData.get("anomalyId") as string;
    if (anomalyId) {
      await markAnomalyReviewed(db, anomalyId);
    }
    return { success: true };
  }

  return { success: false };
}

export default function AnomalyDetectionPage() {
  const { user, insights, anomalies } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isAnalyzing = navigation.formData?.get("intent") === "run-analysis";

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 pt-4 lg:pt-0">
            <h1 className="text-3xl font-bold text-gray-900">Anomaly Detection</h1>
            <p className="mt-2 text-gray-600">
              AI-powered spending pattern analysis to detect unusual transactions
            </p>
          </div>

          {/* Insights Card */}
          <div className="mb-8">
            <AnomalyInsightsCard insights={insights} />
          </div>

          {/* Anomalies List */}
          <div className="mb-8">
            <AnomalyListCard
              anomalies={anomalies}
              onMarkReviewed={(anomalyId) => {
                // Form submission will be triggered by the button
              }}
            />
          </div>

          {/* Tips */}
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Understanding Anomaly Detection
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
              <div>
                <p className="font-medium mb-1">How It Works</p>
                <ul className="space-y-1">
                  <li>• Analyzes transactions using Z-score statistical analysis</li>
                  <li>• Compares amounts to historical spending patterns</li>
                  <li>• Accounts for category-specific spending habits</li>
                  <li>• Uses 30-day rolling averages for adaptive baselines</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-1">Severity Levels</p>
                <ul className="space-y-1">
                  <li>• Critical: 80+ score, extreme deviations</li>
                  <li>• High: 60-79 score, significant outliers</li>
                  <li>• Medium: 40-59 score, unusual patterns</li>
                  <li>• Low: &lt;40 score, minor deviations</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
