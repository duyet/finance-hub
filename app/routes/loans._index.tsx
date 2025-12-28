/**
 * Loans List Page
 *
 * Displays all loans with summary statistics and a grid of loan cards
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "../lib/auth/session.server";
import { getDb } from "../lib/auth/db.server";
import { loanDb } from "../lib/db/loans.server";
import { getLocaleFromRequest } from "../lib/i18n/i18n.server";
import type { Locale } from "../lib/i18n/i18n.config";
import { LoanGrid } from "../components/loans";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const locale = getLocaleFromRequest(request);
  const db = getDb(request);

  // Get all loans for the user
  const loans = await loanDb.getAll(db, user.id);

  // Get summary statistics
  const summary = await loanDb.getSummary(db, user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    locale,
    loans,
    summary,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "createLoan") {
    // Handle loan creation
    const accountId = formData.get("accountId") as string;
    const data = {
      userId: user.id,
      accountId: accountId || "",
      principalOriginal: parseFloat(formData.get("principalOriginal") as string),
      startDate: formData.get("startDate") as string,
      termMonths: parseInt(formData.get("termMonths") as string),
      interestCalculationMethod: (formData.get("interestCalculationMethod") as "FLAT" | "REDUCING_BALANCE") || "REDUCING_BALANCE",
      initialRate: parseFloat(formData.get("initialRate") as string),
      rateType: (formData.get("rateType") as "FIXED" | "FLOATING" | "TEASER") || "FLOATING",
      disbursementDate: formData.get("disbursementDate") as string || null,
      maturityDate: formData.get("maturityDate") as string || null,
      paymentDayOfMonth: formData.get("paymentDayOfMonth") ? parseInt(formData.get("paymentDayOfMonth") as string) : null,
      purpose: formData.get("purpose") as string || null,
      collateralType: formData.get("collateralType") as string || null,
      lenderName: formData.get("lenderName") as string || null,
      lenderAccountNumber: formData.get("lenderAccountNumber") as string || null,
      baseRate: formData.get("baseRate") as string || null,
      marginPercentage: formData.get("marginPercentage") ? parseFloat(formData.get("marginPercentage") as string) : null,
      rateReason: formData.get("rateReason") as string || null,
    };

    try {
      await loanDb.create(db, user.id, data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to create loan" };
    }
  }

  return { success: false, error: "Invalid intent" };
}

export default function LoansListPage() {
  const { user, locale, loans, summary } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-700">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </Link>
              <h1 className="text-2xl font-bold text-indigo-600">Finance Hub</h1>
              <span className="text-gray-300">|</span>
              <Link to="/loans" className="text-gray-900 font-medium">
                Loans
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {user.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={user.name || user.email}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <span className="text-gray-700">
                {user.name || user.email}
              </span>
              <Link
                to="/auth/logout"
                className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Loans</h2>
            <p className="mt-2 text-gray-600">
              Manage your loans and track repayment progress
            </p>
          </div>
          <Button>
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Loan
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Total Outstanding Debt */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Outstanding Debt</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: "USD",
                  }).format(summary.totalOutstandingDebt)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {summary.activeLoansCount} active loan{summary.activeLoansCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          {/* Monthly Payments */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Monthly Payments (Next 30 Days)</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: "USD",
                  }).format(summary.totalMonthlyPayments)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Upcoming payments
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          {/* Weighted Average Rate */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Weighted Average Rate</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {summary.weightedAverageRate.toFixed(2)}%
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Across all active loans
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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
          </Card>
        </div>

        {/* Loans Grid */}
        <LoanGrid loans={loans} locale={locale as Locale} currencyCode="USD" />
      </main>
    </div>
  );
}
