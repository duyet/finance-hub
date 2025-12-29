/**
 * Investments Page
 *
 * Main investment portfolio page with accounts, holdings, and performance
 */

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import {
  getInvestmentAccounts,
  getPortfolioSummary,
  getInvestmentHoldings,
} from "~/lib/services/investments.server";
import { Sidebar } from "~/components/layout/Sidebar";
import {
  PortfolioSummaryCard,
  InvestmentAccountCard,
  HoldingsTable,
  AssetAllocationChart,
} from "~/components/investments";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Get portfolio summary
  const summary = await getPortfolioSummary(db, user.id);

  // Get investment accounts
  const accounts = await getInvestmentAccounts(db, user.id);

  // Get all holdings across all accounts
  const allHoldings: Awaited<ReturnType<typeof getInvestmentHoldings>>[] = [];
  for (const account of accounts) {
    const holdings = await getInvestmentHoldings(db, account.id, user.id);
    allHoldings.push(...holdings);
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    summary,
    accounts,
    holdings: allHoldings,
  };
}

export default function InvestmentsIndexPage() {
  const { user, summary, accounts, holdings } = useLoaderData<typeof loader>();

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
            <h1 className="text-3xl font-bold text-gray-900">Investments</h1>
            <p className="mt-2 text-gray-600">
              Track your investment portfolio and performance
            </p>
          </div>

          {accounts.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="text-6xl mb-4">📈</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Start Your Investment Journey
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Add your first investment account to begin tracking your portfolio performance,
                asset allocation, and gains.
              </p>
              <button
                type="button"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Investment Account
              </button>
            </div>
          ) : (
            <>
              {/* Portfolio Summary */}
              <div className="mb-8">
                <PortfolioSummaryCard summary={summary} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Investment Accounts */}
                <div className="lg:col-span-2">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Investment Accounts</h2>
                  {accounts.length === 0 ? (
                    <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                      <p className="text-gray-600">No investment accounts yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {accounts.map((account) => (
                        <InvestmentAccountCard key={account.id} account={account} />
                      ))}
                    </div>
                  )}
                </div>

                {/* Asset Allocation */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Asset Allocation</h2>
                  <AssetAllocationChart summary={summary} />
                </div>
              </div>

              {/* Holdings Table */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">All Holdings</h2>
                <HoldingsTable holdings={holdings} currency="USD" />
              </div>

              {/* Tips */}
              <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h3 className="font-semibold text-blue-900 mb-3">Investment Tips</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>• <strong>Diversify</strong> your portfolio across different asset classes to reduce risk</li>
                  <li>• <strong>Review regularly</strong> to ensure your allocation matches your goals</li>
                  <li>• <strong>Rebalance</strong> periodically to maintain your target allocation</li>
                  <li>• <strong>Track performance</strong> against relevant benchmarks to assess your strategy</li>
                  <li>• <strong>Consider tax implications</strong> when making investment decisions</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
