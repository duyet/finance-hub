/**
 * RunwayCard Component
 *
 * Displays financial runway (how many months user can survive)
 * Health indicator: Green (>6 months), Yellow (3-6 months), Red (<3 months)
 */

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useI18n } from "~/lib/i18n/client";

interface RunwayCardProps {
  months: number;
  health: "good" | "warning" | "critical";
}

export function RunwayCard({ months, health }: RunwayCardProps) {
  const { t } = useI18n();

  // Determine health colors and icon
  const healthConfig = {
    good: {
      color: "text-green-600",
      bgColor: "bg-green-100",
      progressColor: "bg-green-500",
      icon: CheckCircle2,
      label: "Healthy",
    },
    warning: {
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
      progressColor: "bg-yellow-500",
      icon: Clock,
      label: "Caution",
    },
    critical: {
      color: "text-red-600",
      bgColor: "bg-red-100",
      progressColor: "bg-red-500",
      icon: AlertCircle,
      label: "Critical",
    },
  };

  const config = healthConfig[health];
  const HealthIcon = config.icon;

  // Calculate progress percentage (capped at 12 months for display)
  const progressValue = !Number.isFinite(months) ? 100 : Math.min((months / 12) * 100, 100);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Runway
        </CardTitle>
        <div className={`w-8 h-8 ${config.bgColor} rounded-lg flex items-center justify-center`}>
          <HealthIcon className={`w-4 h-4 ${config.color}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {!Number.isFinite(months) ? "∞" : `${months} ${months === 1 ? "month" : "months"}`}
        </div>
        <div className={`flex items-center text-xs ${config.color} mt-1`}>
          <HealthIcon className="w-3 h-3 mr-1" />
          <span>{config.label}</span>
        </div>
        <div className="mt-3">
          <Progress value={progressValue} className="h-2" />
          <p className="text-xs text-gray-500 mt-1">
            {!Number.isFinite(months)
              ? "No monthly expenses detected"
              : months >= 12
              ? "12+ months of expenses covered"
              : `${Math.round(progressValue)}% of 12-month target`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
