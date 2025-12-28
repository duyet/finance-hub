/**
 * Loan Detail Page
 *
 * Displays comprehensive loan information including:
 * - Loan summary with progress
 * - Interest rate history chart
 * - Amortization schedule
 * - Payment history
 * - Actions (add rate event, record payment)
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, Link, Form } from "react-router";
import { requireAuth } from "../lib/auth/session.server";
import { getDb } from "../lib/auth/db.server";
import { getLoanWithDetails, loanDb, rateEventDb, paymentDb } from "../lib/db/loans.server";
import { getLocaleFromRequest } from "../lib/i18n/i18n.server";
import { calculateLoanSummary } from "../lib/services/amortization";
import type { Locale } from "../lib/i18n/i18n.config";
import {
  LoanSummary,
  RateHistoryChart,
  AmortizationTable,
  RateEventForm,
  PaymentForm,
} from "../components/loans";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const locale = getLocaleFromRequest(request);
  const loanId = params.id;

  if (!loanId) {
    throw new Response("Loan ID is required", { status: 400 });
  }

  // Get complete loan data
  const data = await getLoanWithDetails(request, loanId, user.id);

  if (!data.loan) {
    throw new Response("Loan not found", { status: 404 });
  }

  // Calculate loan summary from installments
  // Convert LoanInstallmentRow to Installment format
  const installmentsForSummary = data.installments.map((inst) => ({
    ...inst,
    due_date: new Date(inst.due_date),
    paid_date: inst.paid_date ? new Date(inst.paid_date) : undefined,
    paid_amount: inst.paid_amount ?? undefined,
    prepayment_amount: inst.prepayment_amount ?? undefined,
    late_fee: inst.late_fee ?? undefined,
    notes: inst.notes ?? undefined,
  }));

  const summary = calculateLoanSummary(
    installmentsForSummary,
    data.loan.principal_original
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    locale,
    ...data,
    summary,
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const loanId = params.id;
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (!loanId) {
    throw new Response("Loan ID is required", { status: 400 });
  }

  // Verify loan belongs to user
  const loan = await loanDb.getById(db, loanId, user.id);
  if (!loan) {
    throw new Response("Loan not found", { status: 404 });
  }

  if (intent === "addRateEvent") {
    const data = {
      loanId,
      effectiveDate: formData.get("effectiveDate") as string,
      ratePercentage: parseFloat(formData.get("ratePercentage") as string),
      rateType: (formData.get("rateType") as "FIXED" | "FLOATING" | "TEASER"),
      baseRate: (formData.get("baseRate") as string | null) || null,
      marginPercentage: formData.get("marginPercentage")
        ? parseFloat(formData.get("marginPercentage") as string)
        : null,
      reason: (formData.get("reason") as string | null) || null,
    };

    try {
      await rateEventDb.add(db, loanId, user.id, data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to add rate event" };
    }
  }

  if (intent === "recordPayment") {
    const data = {
      loanId,
      installmentId: (formData.get("installmentId") as string | null) || null,
      paymentDate: formData.get("paymentDate") as string,
      amount: parseFloat(formData.get("amount") as string),
      principalPortion: parseFloat(formData.get("principalPortion") as string),
      interestPortion: parseFloat(formData.get("interestPortion") as string),
      feePortion: formData.get("feePortion")
        ? parseFloat(formData.get("feePortion") as string)
        : undefined,
      paymentMethod: (formData.get("paymentMethod") as string | null) || null,
      referenceNumber: (formData.get("referenceNumber") as string | null) || null,
      notes: (formData.get("notes") as string | null) || null,
    };

    try {
      await paymentDb.create(db, user.id, data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to record payment" };
    }
  }

  return { success: false, error: "Invalid intent" };
}

export default function LoanDetailPage() {
  const { user, locale, loan, rateEvents, installments, payments, summary } =
    useLoaderData<typeof loader>();

  if (!loan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Loan not found</h1>
          <Link to="/loans" className="text-indigo-600 hover:text-indigo-700 mt-4 inline-block">
            Back to Loans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/loans" className="text-indigo-600 hover:text-indigo-700">
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
              <Link to="/loans" className="text-gray-600 hover:text-gray-900">
                Loans
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-gray-900 font-medium">
                {loan.financial_institution || loan.lender_name || "Loan"}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {user.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={user.name || user.email}
                  className="h-8 w-8 rounded-full"
                />
              )}
              <span className="text-gray-700">{user.name || user.email}</span>
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
        {/* Page Header with Actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-gray-900">
                {loan.financial_institution || loan.lender_name || "Unknown Lender"}
              </h2>
              <Badge variant={loan.is_active === 1 ? "default" : "secondary"}>
                {loan.is_active === 1 ? "Active" : "Closed"}
              </Badge>
            </div>
            <p className="mt-2 text-gray-600">
              Loan ID: {loan.account_id} | Term: {loan.term_months} months
            </p>
          </div>
          <div className="flex gap-2">
            <RateEventForm
              loanId={loan.account_id}
              currentRate={loan.current_interest_rate}
              outstandingPrincipal={loan.principal_outstanding}
              locale={locale as Locale}
              currencyCode="USD"
            />
            <PaymentForm
              loanId={loan.account_id}
              installments={installments}
              locale={locale as Locale}
              currencyCode="USD"
            />
          </div>
        </div>

        {/* Loan Summary Cards */}
        <div className="mb-8">
          <LoanSummary
            loan={{
              financial_institution: loan.financial_institution ?? null,
              principal_original: loan.principal_original,
              principal_outstanding: loan.principal_outstanding,
              start_date: loan.start_date,
              maturity_date: loan.maturity_date,
              current_interest_rate: loan.current_interest_rate,
              interest_calculation_method: loan.interest_calculation_method,
              term_months: loan.term_months,
              purpose: loan.purpose,
              collateral_type: loan.collateral_type,
              lender_name: loan.lender_name,
              is_active: loan.is_active,
            }}
            summary={summary}
            locale={locale as Locale}
            currencyCode="USD"
          />
        </div>

        {/* Interest Rate History */}
        <Card className="p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Interest Rate History
          </h3>
          <RateHistoryChart rateEvents={rateEvents} locale={locale as Locale} />

          {/* Rate Events Table */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Rate Changes</h4>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Effective Date</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Base Rate</TableHead>
                    <TableHead>Margin</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm">
                        {new Date(event.effective_date).toLocaleDateString(locale as Locale)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {event.rate_percentage.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-sm">
                        <Badge variant="outline">{event.rate_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{event.base_rate || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {event.margin_percentage ? `${event.margin_percentage.toFixed(2)}%` : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {event.reason || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>

        {/* Amortization Schedule */}
        <Card className="p-6 mb-8">
          <AmortizationTable installments={installments} locale={locale as Locale} currencyCode="USD" />
        </Card>

        {/* Payment History */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>

          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payments recorded yet
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-sm">
                        {new Date(payment.payment_date).toLocaleDateString(locale as Locale)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {new Intl.NumberFormat(locale as Locale, {
                          style: "currency",
                          currency: "USD",
                        }).format(payment.amount)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Intl.NumberFormat(locale as Locale, {
                          style: "currency",
                          currency: "USD",
                        }).format(payment.principal_portion)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Intl.NumberFormat(locale as Locale, {
                          style: "currency",
                          currency: "USD",
                        }).format(payment.interest_portion)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {payment.fee_portion
                          ? new Intl.NumberFormat(locale as Locale, {
                              style: "currency",
                              currency: "USD",
                            }).format(payment.fee_portion)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {payment.payment_method ? (
                          <Badge variant="outline">{payment.payment_method}</Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-xs">
                        {payment.reference_number || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {payment.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
