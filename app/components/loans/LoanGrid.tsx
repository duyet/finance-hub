/**
 * LoanGrid Component
 *
 * Displays a grid of loan cards with summary information
 */

import { Link } from "react-router";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import type { Locale } from "~/lib/i18n/i18n.config";

// Helper functions that work on both client and server
function formatCurrency(amount: number, currencyCode: string, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

interface Loan {
  account_id: string;
  financial_institution?: string | null;
  principal_original: number;
  principal_outstanding: number;
  current_interest_rate: number;
  start_date: string;
  maturity_date: string | null;
  is_active: number;
}

interface LoanGridProps {
  loans: Loan[];
  locale: Locale;
  currencyCode?: string;
}

export function LoanGrid({ loans, locale, currencyCode = "USD" }: LoanGridProps) {
  if (loans.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No loans</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by adding a new loan.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {loans.map((loan) => {
        const progress = ((loan.principal_original - loan.principal_outstanding) / loan.principal_original) * 100;
        const isActive = loan.is_active === 1;
        const paidOff = loan.principal_outstanding <= 0.01;

        return (
          <Link key={loan.account_id} to={`/loans/${loan.account_id}`}>
            <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {loan.financial_institution || "Unknown Lender"}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Loan ID: {loan.account_id.slice(0, 8)}...
                  </p>
                </div>
                <Badge variant={isActive && !paidOff ? "default" : "secondary"}>
                  {paidOff ? "Paid Off" : isActive ? "Active" : "Closed"}
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium text-gray-900">
                      {progress.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-gray-500">Original</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(loan.principal_original, currencyCode, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Outstanding</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(loan.principal_outstanding, currencyCode, locale)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Interest Rate</p>
                    <p className="text-sm font-medium text-gray-900">
                      {loan.current_interest_rate.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Maturity</p>
                    <p className="text-sm font-medium text-gray-900">
                      {loan.maturity_date
                        ? new Date(loan.maturity_date).toLocaleDateString(locale)
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
