/**
 * StatementCard Component
 *
 * Displays a single credit card statement with status, balance, and actions.
 */

import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { useI18n } from "~/lib/i18n/client";
import type { StatementWithStatus } from "~/lib/db/credit-cards.server";
import { Calendar, DollarSign, FileText, Download, Eye } from "lucide-react";

interface StatementCardProps {
  statement: StatementWithStatus;
  cardName: string;
  currency: string;
  onViewTransactions?: (statementId: string) => void;
  onDownloadPdf?: (statementId: string) => void;
}

export function StatementCard({ statement, cardName, currency, onViewTransactions, onDownloadPdf }: StatementCardProps) {
  const { t, formatDate, formatCurrency } = useI18n();

  const getStatusInfo = () => {
    switch (statement.payment_status) {
      case "PAID":
        return {
          variant: "default" as const,
          className: "bg-green-100 text-green-800 hover:bg-green-200",
          label: t("creditCards.paymentStatus.paid"),
        };
      case "PARTIAL":
        return {
          variant: "secondary" as const,
          className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
          label: t("creditCards.paymentStatus.partial"),
        };
      case "OVERDUE":
        return {
          variant: "destructive" as const,
          className: "bg-red-100 text-red-800 hover:bg-red-200",
          label: t("creditCards.paymentStatus.overdue"),
        };
      default:
        return {
          variant: "secondary" as const,
          className: "bg-blue-100 text-blue-800 hover:bg-blue-200",
          label: t("creditCards.paymentStatus.unpaid"),
        };
    }
  };

  const status = getStatusInfo();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <p className="text-sm font-semibold text-gray-900">
                {t("creditCards.statementFor", { date: formatDate(statement.statement_date) })
              }
              </p>
            </div>
            <p className="text-xs text-gray-600">{cardName}</p>
          </div>

          <Badge className={status.className} variant={status.variant}>
            {status.label}
          </Badge>
        </div>

        {/* Balance Information */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-600">
              <DollarSign className="w-3 h-3" />
              <p className="text-xs">{t("creditCards.statementBalance")}</p>
            </div>
            <p className="text-lg font-bold">{formatCurrency(statement.closing_balance, currency)}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-gray-600">
              <Calendar className="w-3 h-3" />
              <p className="text-xs">{t("creditCards.dueDate")}</p>
            </div>
            <p className={`text-sm font-semibold ${statement.is_overdue ? "text-red-600" : "text-gray-900"}`}>
              {formatDate(statement.due_date)}
            </p>
            <p className="text-xs text-gray-500">
              {statement.is_overdue
                ? t("creditCards.overdueBy", { days: Math.abs(statement.days_until_due) })
                : t("creditCards.daysUntilDue", { days: statement.days_until_due })}
            </p>
          </div>
        </div>

        {/* Payment Progress (for partial payments) */}
        {statement.payment_status === "PARTIAL" && (
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-600">{t("creditCards.paymentProgress")}</span>
              <span className="text-xs font-semibold">
                {formatCurrency(statement.amount_paid, currency)} / {formatCurrency(statement.closing_balance, currency)}
              </span>
            </div>
            <div className="w-full bg-yellow-200 rounded-full h-1.5">
              <div
                className="bg-yellow-600 h-1.5 rounded-full"
                style={{ width: `${(statement.amount_paid / statement.closing_balance) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Additional Details */}
        <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-600">{t("creditCards.minimumPayment")}</p>
            <p className="text-sm font-semibold">{formatCurrency(statement.minimum_payment || 0, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">{t("creditCards.totalCharges")}</p>
            <p className="text-sm font-semibold">{formatCurrency(statement.total_charges, currency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">{t("creditCards.utilization")}</p>
            <p className={`text-sm font-semibold ${statement.utilization > 70 ? "text-red-600" : "text-gray-900"}`}>
              {statement.utilization.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onViewTransactions?.(statement.id)}
          >
            <Eye className="w-4 h-4 mr-1" />
            {t("creditCards.viewTransactions")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownloadPdf?.(statement.id)}
            disabled={!statement.pdf_url}
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {/* Paid Date */}
        {statement.paid_at && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-600">
              {t("creditCards.paidOn", { date: formatDate(statement.paid_at) })}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
