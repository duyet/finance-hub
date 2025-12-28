/**
 * Credit Card Detail Page
 *
 * Shows detailed information about a single credit card including:
 * - Card summary with utilization
 * - Billing cycle timeline
 * - Statement history
 * - Current cycle transactions
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { useLoaderData, useNavigate, Link, Form } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import {
  creditCardDb,
  statementDb,
  getCurrentCycleInfo,
  type CreditCardWithConfig,
  type CurrentCycleInfo,
  type StatementWithStatus,
} from "~/lib/db/credit-cards.server";
import { CreditCardSummary } from "~/components/credit-cards/CreditCardSummary";
import { BillingCycleTimeline } from "~/components/credit-cards/BillingCycleTimeline";
import { StatementList } from "~/components/credit-cards/StatementList";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Progress } from "~/components/ui/progress";
import { ArrowLeft, CreditCard, AlertTriangle, Download } from "lucide-react";
import { useI18n } from "~/lib/i18n/client";
import { generateAndDownloadReport } from "~/lib/services/pdf";
import type { CreditCardStatementData } from "~/components/reports/CreditCardStatement";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const cardId = params.id;

  if (!cardId) {
    throw new Response("Card ID is required", { status: 400 });
  }

  const card = await creditCardDb.getById(db, cardId, user.id);
  if (!card) {
    throw new Response("Card not found", { status: 404 });
  }

  const currentCycle = await getCurrentCycleInfo(db, cardId, user.id);
  const statements = await statementDb.getAll(db, cardId, user.id);

  return ({
    card,
    currentCycle,
    statements,
  });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const cardId = params.id;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (!cardId) {
    throw new Response("Card ID is required", { status: 400 });
  }

  if (intent === "make_payment") {
    const statementId = formData.get("statementId") as string;
    const amount = parseFloat(formData.get("amount") as string);

    if (statementId && amount > 0) {
      await statementDb.updatePayment(db, statementId, user.id, amount);
    }

    return redirect(`/credit-cards/${cardId}`);
  }

  return ({ success: false });
}

export default function CreditCardDetailPage() {
  const { card, currentCycle, statements } = useLoaderData<typeof loader>();
  const { t, formatCurrency, formatDate } = useI18n();
  const navigate = useNavigate();

  /**
   * Handle PDF download for a statement
   * Fetches statement data with transactions and generates PDF client-side
   */
  const handleDownloadStatement = async (statementId: string) => {
    try {
      // Fetch statement data with transactions
      const response = await fetch(`/api/credit-cards/${card.id}/statements/${statementId}/pdf-data`);
      if (!response.ok) {
        throw new Error("Failed to fetch statement data");
      }

      const statementData: CreditCardStatementData = await response.json();

      // Generate and download PDF
      await generateAndDownloadReport({
        type: "credit_card_statement",
        data: statementData,
      });
    } catch (error) {
      console.error("Error generating statement PDF:", error);
      alert("Failed to generate statement PDF. Please try again.");
    }
  };

  const cardWithCycle = {
    ...card,
    currentCycle: currentCycle!,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/credit-cards")}
                className="text-gray-600 hover:text-indigo-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <CreditCard className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-bold text-gray-900">{card.name}</h1>
              <Badge variant="outline">{card.account_number_last4 || "••••"}</Badge>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alert for overdue or high utilization */}
        {(currentCycle!.is_overdue || currentCycle!.utilization_percent > 70) && (
          <Card className="mb-6 border-l-4 border-l-red-500">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-1">
                    {currentCycle!.is_overdue
                      ? t("creditCards.alerts.overdue.title")
                      : t("creditCards.alerts.highUtilization.title")}
                  </h3>
                  <p className="text-sm text-red-700">
                    {currentCycle!.is_overdue
                      ? t("creditCards.alerts.overdue.message", { days: Math.abs(currentCycle!.days_until_due) })
                      : t("creditCards.alerts.highUtilization.message", { percent: currentCycle!.utilization_percent.toFixed(1) })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card Summary */}
            <CreditCardSummary card={cardWithCycle} onClick={() => {}} />

            {/* Billing Cycle Timeline */}
            <BillingCycleTimeline cycle={currentCycle!} />

            {/* Statement History */}
            <StatementList
              statements={statements}
              cardName={card.name}
              currency={card.currency}
              onViewTransactions={(statementId) => navigate(`/credit-cards/${card.id}/statements/${statementId}`)}
              onDownloadPdf={handleDownloadStatement}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("creditCards.quickStats")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">{t("creditCards.creditLimit")}</span>
                    <span className="text-sm font-semibold">
                      {formatCurrency(currentCycle!.credit_limit, card.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">{t("creditCards.availableCredit")}</span>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(currentCycle!.available_credit, card.currency)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <Progress
                      value={Math.min(currentCycle!.utilization_percent, 100)}
                      className="h-2"
                    />
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">{t("creditCards.utilization")}</span>
                      <span className={currentCycle!.utilization_percent > 70 ? "font-semibold text-red-600" : ""}>
                        {currentCycle!.utilization_percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">{t("creditCards.apr")}</span>
                    <span className="text-sm font-semibold">{card.config.apr || "N/A"}%</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">{t("creditCards.annualFee")}</span>
                    <span className="text-sm font-semibold">
                      {formatCurrency(card.config.annual_fee, card.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t("creditCards.gracePeriod")}</span>
                    <span className="text-sm font-semibold">{card.config.grace_period_days} {t("creditCards.days")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Actions */}
            {currentCycle!.payment_status !== "PAID" && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("creditCards.makePayment")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t("creditCards.minimumPayment")}</span>
                      <span className="text-lg font-bold">
                        {formatCurrency(currentCycle!.minimum_payment, card.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{t("creditCards.statementBalance")}</span>
                      <span className="text-lg font-bold">
                        {formatCurrency(currentCycle!.current_balance, card.currency)}
                      </span>
                    </div>
                    <Link
                      to={`/credit-cards/${card.id}/payment`}
                      className="block w-full text-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      {t("creditCards.payNow")}
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("creditCards.settings")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link
                  to={`/credit-cards/${card.id}/edit`}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-md transition-colors"
                >
                  {t("creditCards.editCard")}
                </Link>
                <Link
                  to={`/credit-cards/${card.id}/limits`}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 rounded-md transition-colors"
                >
                  {t("creditCards.adjustLimits")}
                </Link>
                <Form method="post" className="block">
                  <input type="hidden" name="intent" value="archive" />
                  <button
                    type="submit"
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    onClick={(e) => {
                      if (!confirm(t("creditCards.confirmArchive"))) {
                        e.preventDefault();
                      }
                    }}
                  >
                    {t("creditCards.archiveCard")}
                  </button>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
