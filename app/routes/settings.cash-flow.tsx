/**
 * Cash Flow Forecasting Page
 *
 * View and manage cash flow predictions and alerts
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useNavigation, Form } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import {
  getCashFlowSummary,
  getCashFlowPredictions,
  getCashFlowAlerts,
  regenerateCashFlowForecast,
  resolveCashFlowAlert,
} from "~/lib/services/cash-flow.server";
import { Sidebar } from "~/components/layout/Sidebar";
import {
  CashFlowSummaryCard,
  CashFlowChart,
  CashFlowAlertsCard,
} from "~/components/cash-flow";
import { Card, CardContent } from "~/components/ui/card";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Generate forecasts if none exist
  const existingPredictions = await getCashFlowPredictions(db, user.id, 30);
  if (existingPredictions.length === 0) {
    await regenerateCashFlowForecast(db, user.id, 30);
  }

  // Get fresh data
  const summary = await getCashFlowSummary(db, user.id, 30);
  const predictions = await getCashFlowPredictions(db, user.id, 30);
  const alerts = await getCashFlowAlerts(db, user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    summary,
    predictions,
    alerts,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "regenerate") {
    await regenerateCashFlowForecast(db, user.id, 30);
    return { success: true };
  }

  if (intent === "resolve-alert") {
    const alertId = formData.get("alertId") as string;
    if (alertId) {
      await resolveCashFlowAlert(db, alertId);
    }
    return { success: true };
  }

  return { success: false };
}

export default function CashFlowPage() {
  const { user, summary, predictions, alerts } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isRegenerating = navigation.formData?.get("intent") === "regenerate";

  const handleRegenerate = () => {
    // Form submission will be triggered by the button
  };

  const handleResolveAlert = (alertId: string) => {
    // Form submission will be triggered by the button
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 pt-4 lg:pt-0">
            <h1 className="text-3xl font-bold text-gray-900">Cash Flow Forecasting</h1>
            <p className="mt-2 text-gray-600">
              Predict your future cash balance based on recurring transactions
            </p>
          </div>

          {/* Summary Card */}
          <div className="mb-8">
            <CashFlowSummaryCard
              summary={summary}
              onRegenerate={handleRegenerate}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Chart */}
            <div className="lg:col-span-2">
              <CashFlowChart predictions={predictions} />
            </div>

            {/* Alerts */}
            <div>
              <CashFlowAlertsCard
                alerts={alerts}
                onResolve={handleResolveAlert}
              />
            </div>
          </div>

          {/* Tips */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Cash Flow Forecasting Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Understanding Forecasts</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Based on your recurring transactions</li>
                    <li>• Confidence decreases over time</li>
                    <li>• Regenerate when transactions change</li>
                    <li>• Predictions are estimates, not guarantees</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Improving Accuracy</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Keep recurring transactions up to date</li>
                    <li>• Include all regular income and expenses</li>
                    <li>• Set accurate transaction amounts</li>
                    <li>• Review alerts regularly for adjustments</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
