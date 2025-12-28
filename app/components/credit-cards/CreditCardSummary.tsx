/**
 * CreditCardSummary Component
 *
 * Displays a single credit card summary with utilization gauge, balance, and key metrics.
 */

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { useI18n } from "~/lib/i18n/client";
import type { CreditCardWithConfig, CurrentCycleInfo } from "~/lib/db/credit-cards.server";

interface CreditCardSummaryProps {
  card: CreditCardWithConfig & { currentCycle: CurrentCycleInfo };
  onClick?: () => void;
}

export function CreditCardSummary({ card, onClick }: CreditCardSummaryProps) {
  const { t, formatCurrency, formatDate } = useI18n();
  const { currentCycle } = card;

  // Determine status color and text
  const getStatusInfo = () => {
    if (currentCycle.is_overdue) {
      return {
        color: "text-red-600",
        bgColor: "bg-red-100",
        text: t("creditCards.status.overdue"),
      };
    }
    if (currentCycle.urgency === "urgent") {
      return {
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        text: t("creditCards.status.paymentDue"),
      };
    }
    if (currentCycle.urgency === "high") {
      return {
        color: "text-yellow-600",
        bgColor: "bg-yellow-100",
        text: t("creditCards.status.paymentComing"),
      };
    }
    return {
      color: "text-green-600",
      bgColor: "bg-green-100",
      text: t("creditCards.status.onTrack"),
    };
  };

  const status = getStatusInfo();

  // Card theme colors (gradient background)
  const cardColor = card.color_theme || "blue";
  const cardGradient = getCardGradient(cardColor);

  return (
    <Card
      className={`overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${
        onClick ? "hover:scale-[1.02]" : ""
      }`}
      onClick={onClick}
    >
      {/* Credit Card Visual */}
      <div className={`${cardGradient} p-6 text-white`}>
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-sm opacity-80">{card.institution_name || t("creditCards.bank")}</p>
            <h3 className="text-xl font-bold mt-1">{card.name}</h3>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${status.bgColor} ${status.color}`}>
            {status.text}
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs opacity-80 mb-1">{t("creditCards.cardNumber")}</p>
            <p className="font-mono text-lg">•••• {card.account_number_last4 || "••••"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80 mb-1">{t("creditCards.currentBalance")}</p>
            <p className="text-2xl font-bold">{formatCurrency(currentCycle.current_balance, card.currency)}</p>
          </div>
        </div>
      </div>

      {/* Card Details */}
      <CardContent className="p-6 space-y-4">
        {/* Credit Limit & Utilization */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">{t("creditCards.creditLimit")}</span>
            <span className="text-sm font-semibold">
              {formatCurrency(currentCycle.credit_limit, card.currency)}
            </span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">{t("creditCards.availableCredit")}</span>
            <span className="text-sm font-semibold text-green-600">
              {formatCurrency(currentCycle.available_credit, card.currency)}
            </span>
          </div>
          <div className="space-y-1">
            <Progress
              value={Math.min(currentCycle.utilization_percent, 100)}
              className="h-2"
            />
            <div className="flex justify-between text-xs text-gray-600">
              <span>{t("creditCards.utilization")}</span>
              <span className={currentCycle.utilization_percent > 70 ? "font-semibold text-red-600" : ""}>
                {currentCycle.utilization_percent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Payment Due Info */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-600 mb-1">{t("creditCards.minimumPayment")}</p>
            <p className="text-lg font-semibold">{formatCurrency(currentCycle.minimum_payment, card.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">{t("creditCards.dueDate")}</p>
            <p className={`text-lg font-semibold ${status.color}`}>
              {formatDate(currentCycle.due_date)}
            </p>
            <p className="text-xs text-gray-500">
              {currentCycle.days_until_due > 0
                ? t("creditCards.daysUntilDue", { days: currentCycle.days_until_due })
                : t("creditCards.overdue")}
            </p>
          </div>
        </div>

        {/* APR */}
        {card.config.apr && (
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{t("creditCards.apr")}</span>
              <span className="text-sm font-semibold">{card.config.apr}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getCardGradient(color: string): string {
  const gradients: Record<string, string> = {
    blue: "bg-gradient-to-br from-blue-500 to-blue-700",
    green: "bg-gradient-to-br from-green-500 to-green-700",
    purple: "bg-gradient-to-br from-purple-500 to-purple-700",
    red: "bg-gradient-to-br from-red-500 to-red-700",
    orange: "bg-gradient-to-br from-orange-500 to-orange-700",
    pink: "bg-gradient-to-br from-pink-500 to-pink-700",
    indigo: "bg-gradient-to-br from-indigo-500 to-indigo-700",
    teal: "bg-gradient-to-br from-teal-500 to-teal-700",
  };

  return gradients[color] || gradients.blue;
}
