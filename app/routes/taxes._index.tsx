/**
 * Taxes Page
 *
 * Tax tracking, capital gains reporting, and tax loss harvesting
 */

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import {
  generateTaxReport,
  identifyTaxLossHarvestingOpportunities,
  getTaxLots,
  getTaxPreferences,
} from "~/lib/services/taxes.server";
import { Sidebar } from "~/components/layout/Sidebar";
import {
  TaxReportCard,
  CapitalGainsTable,
  TaxLossHarvestingCard,
  TaxLotTable,
  TaxPreferencesPanel,
} from "~/components/taxes";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Get current tax year (default to current year)
  const currentTaxYear = new Date().getFullYear();

  // Generate tax report
  const taxReport = await generateTaxReport(db, user.id, currentTaxYear);

  // Identify tax loss harvesting opportunities
  const harvestingOpportunities = await identifyTaxLossHarvestingOpportunities(db, user.id);

  // Get tax lots (open positions)
  const taxLots = await getTaxLots(db, user.id, { includeClosed: false });

  // Get tax preferences
  const taxPreferences = await getTaxPreferences(db, user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    taxReport,
    harvestingOpportunities,
    taxLots,
    taxPreferences,
    currentTaxYear,
  };
}

export default function TaxesIndexPage() {
  const {
    user,
    taxReport,
    harvestingOpportunities,
    taxLots,
    taxPreferences,
    currentTaxYear,
  } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 pt-4 lg:pt-0">
            <h1 className="text-3xl font-bold text-gray-900">Taxes</h1>
            <p className="mt-2 text-gray-600">
              Track capital gains, harvest tax losses, and prepare for tax season
            </p>
          </div>

          {/* Tax Report Summary */}
          <div className="mb-8">
            <TaxReportCard report={taxReport} />
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Capital Gains Table */}
            <div className="lg:col-span-2">
              <CapitalGainsTable report={taxReport} />
            </div>

            {/* Tax Preferences */}
            <div>
              <TaxPreferencesPanel preferences={taxPreferences} />
            </div>
          </div>

          {/* Tax Loss Harvesting */}
          {harvestingOpportunities.length > 0 && (
            <div className="mb-8">
              <TaxLossHarvestingCard opportunities={harvestingOpportunities} />
            </div>
          )}

          {/* Tax Lots */}
          <div className="mb-8">
            <TaxLotTable lots={taxLots} />
          </div>

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-3">Tax Planning Tips</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• <strong>Hold &gt; 1 Year</strong>: Long-term capital gains are taxed at lower rates than short-term</li>
              <li>• <strong>Harvest Losses</strong>: Sell positions at a loss to offset gains and reduce your tax bill</li>
              <li>• <strong>Watch Wash Sales</strong>: Wait 30 days before repurchasing similar securities after harvesting</li>
              <li>• <strong>Maximize Tax-Advantaged Accounts</strong>: Use retirement accounts to defer or eliminate taxes</li>
              <li>• <strong>Keep Good Records</strong>: Maintain accurate cost basis records for all investments</li>
              <li>• <strong>Consider Dividends</strong>: Qualified dividends are taxed at long-term rates</li>
              <li>• <strong>Consult a Professional</strong>: Tax laws are complex and subject to change</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
