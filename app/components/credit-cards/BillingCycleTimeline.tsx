/**
 * BillingCycleTimeline Component
 *
 * Horizontal stepper showing the billing cycle timeline:
 * Start Date → Today → Statement Date → Due Date
 */

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { useI18n } from "~/lib/i18n/client";
import type { CurrentCycleInfo } from "~/lib/db/credit-cards.server";
import { CalendarDays, Clock, FileText, AlertCircle } from "lucide-react";

interface BillingCycleTimelineProps {
  cycle: CurrentCycleInfo;
}

export function BillingCycleTimeline({ cycle }: BillingCycleTimelineProps) {
  const { t, formatDate } = useI18n();

  const steps = [
    {
      key: "start",
      icon: CalendarDays,
      label: t("creditCards.cycleStart"),
      date: cycle.cycle_start_date,
      isPast: true,
    },
    {
      key: "today",
      icon: Clock,
      label: t("creditCards.today"),
      date: new Date(),
      isCurrent: true,
    },
    {
      key: "statement",
      icon: FileText,
      label: t("creditCards.statementDate"),
      date: cycle.statement_date,
      daysRemaining: cycle.days_until_statement,
    },
    {
      key: "due",
      icon: AlertCircle,
      label: t("creditCards.dueDate"),
      date: cycle.due_date,
      daysRemaining: cycle.days_until_due,
      isUrgent: cycle.urgency === "urgent" || cycle.is_overdue,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t("creditCards.billingCycle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">{t("creditCards.cycleProgress")}</span>
            <span className="text-sm font-semibold">{cycle.cycle_progress.toFixed(0)}%</span>
          </div>
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${cycle.cycle_progress}%` }}
            />
            {/* Today indicator */}
            <div
              className="absolute top-0 h-full w-0.5 bg-blue-900"
              style={{ left: `${cycle.cycle_progress}%` }}
            />
          </div>
        </div>

        {/* Timeline Steps */}
        <div className="relative">
          {/* Connecting Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10" />

          <div className="grid grid-cols-4 gap-2">
            {steps.map((step) => {
              const Icon = step.icon;
              const isCompleted = step.isPast;
              const isCurrent = step.isCurrent;

              return (
                <div key={step.key} className="flex flex-col items-center">
                  {/* Icon Circle */}
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center mb-2
                      ${isCompleted ? "bg-green-100 text-green-600" : ""}
                      ${isCurrent ? "bg-blue-600 text-white ring-4 ring-blue-100" : ""}
                      ${step.isUrgent ? "bg-red-100 text-red-600" : ""}
                      ${!isCompleted && !isCurrent && !step.isUrgent ? "bg-gray-100 text-gray-600" : ""}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Label */}
                  <p className="text-xs text-center text-gray-600 mb-1">{step.label}</p>

                  {/* Date */}
                  <p className={`text-xs text-center font-medium ${isCurrent ? "text-blue-600" : "text-gray-900"}`}>
                    {formatDate(step.date)}
                  </p>

                  {/* Days Remaining/Elapsed */}
                  {step.daysRemaining !== undefined && (
                    <Badge
                      variant={step.daysRemaining <= 3 ? "destructive" : "secondary"}
                      className="mt-1 text-xs"
                    >
                      {step.daysRemaining > 0
                        ? t("creditCards.daysRemaining", { days: step.daysRemaining })
                        : t("creditCards.overdue")}
                    </Badge>
                  )}

                  {/* Current Indicator */}
                  {isCurrent && (
                    <Badge className="mt-1 bg-blue-600 text-white">{t("creditCards.current")}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Info */}
        <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-xs text-gray-600 mb-1">{t("creditCards.cycleLength")}</p>
            <p className="text-sm font-semibold">
              {t("creditCards.days", { count: Math.round((cycle.due_date.getTime() - cycle.cycle_start_date.getTime()) / (1000 * 60 * 60 * 24)) })}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">{t("creditCards.gracePeriod")}</p>
            <p className="text-sm font-semibold">
              {t("creditCards.days", { count: Math.round((cycle.due_date.getTime() - cycle.statement_date.getTime()) / (1000 * 60 * 60 * 24)) })}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
