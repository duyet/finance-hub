/**
 * PaymentDueAlert Component
 *
 * Displays alerts for upcoming or overdue credit card payments on the dashboard.
 */

import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { useI18n } from "~/lib/i18n/client";
import type { StatementWithStatus } from "~/lib/db/credit-cards.server";
import { AlertTriangle, Calendar, CreditCard, ChevronRight } from "lucide-react";
import { Link } from "react-router";

interface PaymentDueAlertProps {
  unpaidStatements: Array<
    StatementWithStatus & {
      card_name: string;
      card_id: string;
    }
  >;
}

export function PaymentDueAlert({ unpaidStatements }: PaymentDueAlertProps) {
  const { t, formatDate, formatCurrency } = useI18n();

  // Filter: Only show urgent (due within 7 days) or overdue
  const urgentStatements = unpaidStatements.filter((s) => s.is_overdue || s.days_until_due <= 7);

  if (urgentStatements.length === 0) {
    return null;
  }

  const overdueCount = urgentStatements.filter((s) => s.is_overdue).length;
  const isAllOverdue = overdueCount === urgentStatements.length;

  return (
    <Card className={`border-l-4 ${isAllOverdue ? "border-l-red-500 bg-red-50" : "border-l-yellow-500 bg-yellow-50"}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`p-2 rounded-full ${isAllOverdue ? "bg-red-100" : "bg-yellow-100"}`}>
            <AlertTriangle className={`w-5 h-5 ${isAllOverdue ? "text-red-600" : "text-yellow-600"}`} />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className={`font-semibold ${isAllOverdue ? "text-red-900" : "text-yellow-900"}`}>
                  {isAllOverdue
                    ? t("creditCards.alerts.overdue.title")
                    : t("creditCards.alerts.paymentDue.title")}
                </h3>
                <p className={`text-sm mt-1 ${isAllOverdue ? "text-red-700" : "text-yellow-700"}`}>
                  {isAllOverdue
                    ? t("creditCards.alerts.overdue.dashboardMessage", { count: overdueCount })
                    : t("creditCards.alerts.paymentDue.dashboardMessage", { count: urgentStatements.length })}
                </p>
              </div>

              <Badge variant={isAllOverdue ? "destructive" : "secondary"} className={isAllOverdue ? "" : "bg-yellow-200 text-yellow-900"}>
                {isAllOverdue ? t("creditCards.overdue") : t("creditCards.actionNeeded")}
              </Badge>
            </div>

            {/* Statement List */}
            <div className="space-y-2 mt-4">
              {urgentStatements.slice(0, 3).map((statement) => (
                <div
                  key={statement.id}
                  className={`p-3 rounded-lg border ${statement.is_overdue ? "bg-red-100 border-red-200" : "bg-white border-gray-200"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className={`w-4 h-4 ${statement.is_overdue ? "text-red-600" : "text-gray-600"}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{statement.card_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <p className="text-xs text-gray-600">{formatDate(statement.due_date)}</p>
                          {statement.is_overdue && (
                            <Badge variant="destructive" className="text-xs py-0 h-4">
                              {t("creditCards.overdueBy", { days: Math.abs(statement.days_until_due) })}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">
                        {formatCurrency(statement.minimum_payment || statement.closing_balance, "VND")}
                      </p>
                      <p className="text-xs text-gray-600">{t("creditCards.minimumPayment")}</p>
                    </div>
                  </div>
                </div>
              ))}

              {urgentStatements.length > 3 && (
                <p className="text-sm text-gray-600 text-center pt-2">
                  {t("creditCards.alerts.morePending", { count: urgentStatements.length - 3 })}
                </p>
              )}
            </div>

            {/* Action Button */}
            <Link to="/credit-cards">
              <Button
                variant={isAllOverdue ? "destructive" : "default"}
                className="mt-4 w-full sm:w-auto"
                size="sm"
              >
                {t("creditCards.alerts.viewAllCards")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * High Utilization Alert Component
 *
 * Displays warnings for credit cards with high utilization (>70%).
 */
interface HighUtilizationAlertProps {
  highUtilizationCards: Array<{
    card_id: string;
    card_name: string;
    utilization_percent: number;
    credit_limit: number;
    current_balance: number;
    currency: string;
  }>;
}

export function HighUtilizationAlert({ highUtilizationCards }: HighUtilizationAlertProps) {
  const { t, formatCurrency } = useI18n();

  if (highUtilizationCards.length === 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-orange-500 bg-orange-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="p-2 rounded-full bg-orange-100">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-orange-900">{t("creditCards.alerts.highUtilization.title")}</h3>
                <p className="text-sm mt-1 text-orange-700">
                  {t("creditCards.alerts.highUtilization.dashboardMessage", { count: highUtilizationCards.length })}
                </p>
              </div>

              <Badge className="bg-orange-200 text-orange-900">
                {t("creditCards.alerts.highUtilization.badge")}
              </Badge>
            </div>

            {/* Cards List */}
            <div className="space-y-2 mt-4">
              {highUtilizationCards.slice(0, 3).map((card) => (
                <div key={card.card_id} className="p-3 rounded-lg border border-orange-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-4 h-4 text-orange-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{card.card_name}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {formatCurrency(card.current_balance, card.currency)} / {formatCurrency(card.credit_limit, card.currency)}
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive" className="bg-red-600">
                      {card.utilization_percent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}

              {highUtilizationCards.length > 3 && (
                <p className="text-sm text-gray-600 text-center pt-2">
                  {t("creditCards.alerts.moreCards", { count: highUtilizationCards.length - 3 })}
                </p>
              )}
            </div>

            {/* Action Button */}
            <Link to="/credit-cards">
              <Button variant="outline" className="mt-4 w-full sm:w-auto" size="sm">
                {t("creditCards.alerts.viewAllCards")}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
