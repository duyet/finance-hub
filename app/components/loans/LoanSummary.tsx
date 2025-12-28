/**
 * LoanSummary Component
 *
 * Displays detailed summary of a single loan
 */

import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import type { Locale } from "~/lib/i18n/i18n.config";

// Helper functions that work on both client and server
function formatCurrency(amount: number, currencyCode: string, locale: Locale): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
  }).format(amount);
}

function formatDate(date: string, locale: Locale, format: string): string {
  const dateObj = new Date(date);
  const options: Intl.DateTimeFormatOptions = format === "medium"
    ? { year: "numeric", month: "short", day: "numeric" }
    : { year: "numeric", month: "2-digit", day: "2-digit" };
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

interface LoanSummaryProps {
  loan: {
    financial_institution: string | null;
    principal_original: number;
    principal_outstanding: number;
    start_date: string;
    maturity_date: string | null;
    current_interest_rate: number;
    interest_calculation_method: "FLAT" | "REDUCING_BALANCE";
    term_months: number;
    purpose: string | null;
    collateral_type: string | null;
    lender_name: string | null;
    is_active: number;
  };
  summary: {
    total_principal_paid: number;
    total_interest_paid: number;
    total_paid: number;
    remaining_principal: number;
    remaining_payments: number;
    next_payment_date: Date | null;
    next_payment_amount: number;
    total_interest_projected: number;
    total_payment_projected: number;
  };
  locale: Locale;
  currencyCode?: string;
}

export function LoanSummary({ loan, summary, locale, currencyCode = "USD" }: LoanSummaryProps) {
  const progress = ((loan.principal_original - loan.principal_outstanding) / loan.principal_original) * 100;
  const isActive = loan.is_active === 1;
  const paidOff = loan.principal_outstanding <= 0.01;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Loan Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Loan Details</h3>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Lender</span>
            <span className="text-sm font-medium text-gray-900">
              {loan.financial_institution || loan.lender_name || "N/A"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Purpose</span>
            <span className="text-sm font-medium text-gray-900">
              {loan.purpose || "N/A"}
            </span>
          </div>

          {loan.collateral_type && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Collateral</span>
              <span className="text-sm font-medium text-gray-900">
                {loan.collateral_type}
              </span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Start Date</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDate(loan.start_date, locale, "medium")}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Maturity Date</span>
            <span className="text-sm font-medium text-gray-900">
              {loan.maturity_date
                ? formatDate(loan.maturity_date, locale, "medium")
                : "N/A"}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Term</span>
            <span className="text-sm font-medium text-gray-900">
              {loan.term_months} months
            </span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Status</span>
            <Badge variant={isActive && !paidOff ? "default" : "secondary"}>
              {paidOff ? "Paid Off" : isActive ? "Active" : "Closed"}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Principal & Interest */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Principal & Interest</h3>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Original Principal</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(loan.principal_original, currencyCode, locale)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Outstanding Principal</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(loan.principal_outstanding, currencyCode, locale)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Principal Paid</span>
            <span className="text-sm font-medium text-green-600">
              {formatCurrency(summary.total_principal_paid, currencyCode, locale)}
            </span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Current Rate</span>
            <span className="text-sm font-medium text-gray-900">
              {loan.current_interest_rate.toFixed(2)}%
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Calculation Method</span>
            <span className="text-sm font-medium text-gray-900">
              {loan.interest_calculation_method === "REDUCING_BALANCE"
                ? "Reducing Balance"
                : "Flat Rate"}
            </span>
          </div>

          <Separator />

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Interest Paid</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(summary.total_interest_paid, currencyCode, locale)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Interest Projected</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(summary.total_interest_projected, currencyCode, locale)}
            </span>
          </div>
        </div>
      </Card>

      {/* Payment Progress */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Progress</h3>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Loan Repayment Progress</span>
              <span className="font-medium text-gray-900">
                {progress.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-indigo-600 h-3 rounded-full transition-all"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Paid</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(summary.total_paid, currencyCode, locale)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Projected</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(summary.total_payment_projected, currencyCode, locale)}
              </span>
            </div>

            <Separator />

            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Remaining Payments</span>
              <span className="text-sm font-medium text-gray-900">
                {summary.remaining_payments}
              </span>
            </div>

            {summary.next_payment_date && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Next Payment Date</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatDate(summary.next_payment_date.toISOString().split("T")[0], locale, "medium")}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Next Payment Amount</span>
                  <span className="text-sm font-medium text-indigo-600">
                    {formatCurrency(summary.next_payment_amount, currencyCode, locale)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
