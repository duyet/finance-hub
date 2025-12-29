/**
 * Net Worth Page
 *
 * Track net worth over time with timeline and milestones
 */

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import {
  calculateNetWorth,
  getNetWorthSummary,
  getNetWorthSnapshots,
  getNetWorthMilestones,
  createNetWorthSnapshot,
  checkMilestoneAchievements,
} from "~/lib/services/net-worth.server";
import { Sidebar } from "~/components/layout/Sidebar";
import {
  NetWorthSummaryCard,
  NetWorthTimelineChart,
  NetWorthMilestonesCard,
  AssetAllocationCard,
} from "~/components/net-worth";
import { Card, CardContent } from "~/components/ui/card";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Get net worth summary
  const summary = await getNetWorthSummary(db, user.id);

  // Get historical snapshots (past 24 months)
  const snapshots = await getNetWorthSnapshots(db, user.id, { months: 24 });

  // Get milestones
  const milestones = await getNetWorthMilestones(db, user.id);

  // Get latest snapshot for allocation
  const latestSnapshot = snapshots.length > 0 ? snapshots[0] : null;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    summary,
    snapshots,
    milestones,
    latestSnapshot,
  };
}

export default function NetWorthPage() {
  const { user, summary, snapshots, milestones, latestSnapshot } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 pt-4 lg:pt-0">
            <h1 className="text-3xl font-bold text-gray-900">Net Worth</h1>
            <p className="mt-2 text-gray-600">
              Track your financial progress over time
            </p>
          </div>

          {/* Summary Card */}
          <div className="mb-8">
            <NetWorthSummaryCard summary={summary} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Timeline Chart */}
            <div className="lg:col-span-2">
              <NetWorthTimelineChart snapshots={snapshots} />
            </div>

            {/* Asset Allocation */}
            <div>
              <AssetAllocationCard snapshot={latestSnapshot} />
            </div>
          </div>

          {/* Milestones */}
          <div className="mb-8">
            <NetWorthMilestonesCard
              milestones={milestones}
              currentNetWorth={summary.currentNetWorth}
            />
          </div>

          {/* Tips */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Net Worth Tracking Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Building Net Worth</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Save and invest consistently</li>
                    <li>• Reduce high-interest debt first</li>
                    <li>• Diversify your investments</li>
                    <li>• Increase income over time</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Measuring Progress</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Track monthly for trends</li>
                    <li>• Focus on year-over-year growth</li>
                    <li>• Set realistic milestones</li>
                    <li>• Celebrate achieving goals</li>
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
