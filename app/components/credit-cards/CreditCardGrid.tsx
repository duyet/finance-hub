/**
 * CreditCardGrid Component
 *
 * Grid layout displaying multiple credit cards.
 */

import { CreditCardSummary } from "./CreditCardSummary";
import type { CreditCardWithConfig, CurrentCycleInfo } from "~/lib/db/credit-cards.server";
import { useI18n } from "~/lib/i18n/client";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useNavigate } from "react-router";

interface CreditCardGridProps {
  cards: Array<CreditCardWithConfig & { currentCycle: CurrentCycleInfo }>;
  onAddCard?: () => void;
}

export function CreditCardGrid({ cards, onAddCard }: CreditCardGridProps) {
  const { t } = useI18n();
  const navigate = useNavigate();

  if (cards.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <Plus className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("creditCards.noCards")}</h3>
        <p className="text-gray-600 mb-6">{t("creditCards.noCardsDescription")}</p>
        {onAddCard && (
          <button
            onClick={onAddCard}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t("creditCards.addFirstCard")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{t("creditCards.myCards")}</h2>
        {onAddCard && (
          <button
            onClick={onAddCard}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t("creditCards.addCard")}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <CreditCardSummary
            key={card.id}
            card={card}
            onClick={() => navigate(`/credit-cards/${card.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
