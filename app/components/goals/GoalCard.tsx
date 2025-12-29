/**
 * Financial Goal Card Component
 *
 * Displays a financial goal with progress visualization,
 * target date countdown, and action buttons.
 */

import { Card } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import {
  PiggyBank,
  TrendingDown,
  Target,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Pause,
  MoreVertical,
  Edit,
  Trash2,
  Play,
} from "lucide-react";
import type { FinancialGoalWithProgress } from "~/lib/db/financial-goals.server";

interface GoalCardProps {
  goal: FinancialGoalWithProgress;
  currency?: string;
  onEdit?: (goal: FinancialGoalWithProgress) => void;
  onDelete?: (goalId: string) => void;
  onPause?: (goalId: string) => void;
  onResume?: (goalId: string) => void;
}

export function GoalCard({
  goal,
  currency = "VND",
  onEdit,
  onDelete,
  onPause,
  onResume,
}: GoalCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getGoalIcon = () => {
    switch (goal.goal_type) {
      case "savings":
        return <PiggyBank className="w-5 h-5" />;
      case "debt_payoff":
        return <TrendingDown className="w-5 h-5" />;
      case "expense_limit":
        return <Target className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  const getStatusBadge = () => {
    switch (goal.status) {
      case "completed":
        return (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>Completed</span>
          </div>
        );
      case "paused":
        return (
          <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-sm font-medium">
            <Pause className="w-4 h-4" />
            <span>Paused</span>
          </div>
        );
      case "cancelled":
        return (
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400 text-sm font-medium">
            <span>Cancelled</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getProgressColor = () => {
    if (goal.status === "completed") return "bg-green-500";
    if (goal.on_track === false) return "bg-red-500";
    if (goal.progress_percentage >= 90) return "bg-green-500";
    if (goal.progress_percentage >= 50) return "bg-blue-500";
    return "bg-yellow-500";
  };

  const getDaysRemainingText = () => {
    if (goal.days_remaining === null) return null;
    if (goal.days_remaining < 0) {
      return <span className="text-red-600 dark:text-red-400 text-sm">Overdue by {Math.abs(goal.days_remaining)} days</span>;
    }
    if (goal.days_remaining === 0) {
      return <span className="text-orange-600 dark:text-orange-400 text-sm">Due today</span>;
    }
    if (goal.days_remaining === 1) {
      return <span className="text-blue-600 dark:text-blue-400 text-sm">1 day left</span>;
    }
    if (goal.days_remaining <= 7) {
      return <span className="text-orange-600 dark:text-orange-400 text-sm">{goal.days_remaining} days left</span>;
    }
    return <span className="text-gray-600 dark:text-gray-400 text-sm">{goal.days_remaining} days left</span>;
  };

  return (
    <TooltipProvider>
      <Card
        className={`p-5 transition-all hover:shadow-md ${
          goal.status === "completed"
            ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"
            : goal.on_track === false
              ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
              : ""
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: goal.color_theme ? `${goal.color_theme}20` : "#f3f4f6" }}
            >
              <div
                className="text-gray-700 dark:text-gray-300"
                style={{ color: goal.color_theme || undefined }}
              >
                {goal.icon || getGoalIcon()}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                {goal.name}
              </h3>
              {goal.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {goal.description}
                </p>
              )}
              {goal.category_name && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Category: {goal.category_name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {onEdit && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(goal)}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && goal.status !== "completed" && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(goal.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Progress
              </span>
              <span className={`text-sm font-bold ${
                goal.progress_percentage >= 100
                  ? "text-green-600 dark:text-green-400"
                  : goal.on_track === false
                    ? "text-red-600 dark:text-red-400"
                    : "text-gray-900 dark:text-gray-100"
              }`}>
                {Math.min(100, goal.progress_percentage).toFixed(0)}%
              </span>
            </div>
            <Progress
              value={Math.min(100, goal.progress_percentage)}
              className="h-2"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Saved</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(Math.abs(goal.current_amount))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-600 dark:text-gray-400">Target</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">
                {formatCurrency(goal.target_amount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-600 dark:text-gray-400">Remaining</p>
              <p className={`font-semibold ${
                goal.remaining_amount <= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-900 dark:text-gray-100"
              }`}>
                {formatCurrency(Math.max(0, goal.remaining_amount))}
              </p>
            </div>
          </div>

          {goal.target_date && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Target: {new Date(goal.target_date).toLocaleDateString("vi-VN")}
              </span>
              <span className="ml-auto">{getDaysRemainingText()}</span>
            </div>
          )}

          {goal.on_track === false && goal.status === "active" && (
            <div className="flex items-start gap-2 p-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-orange-700 dark:text-orange-300">
                Behind schedule. Save {formatCurrency(goal.monthly_contribution_needed || 0)}/month to reach target.
              </p>
            </div>
          )}

          {goal.status === "active" && onPause && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => onPause(goal.id)} className="flex-1">
                <Pause className="w-4 h-4 mr-1" />
                Pause
              </Button>
            </div>
          )}

          {goal.status === "paused" && onResume && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => onResume(goal.id)} className="flex-1">
                <Play className="w-4 h-4 mr-1" />
                Resume
              </Button>
            </div>
          )}
        </div>
      </Card>
    </TooltipProvider>
  );
}

/**
 * Compact goal card for dashboard
 */
export function GoalCardCompact({
  goal,
  currency = "VND",
  onClick,
}: {
  goal: FinancialGoalWithProgress;
  currency?: string;
  onClick?: () => void;
}) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:shadow-sm transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: goal.color_theme ? `${goal.color_theme}20` : "#f3f4f6" }}
        >
          <div className="text-gray-700 dark:text-gray-300 text-sm" style={{ color: goal.color_theme || undefined }}>
            {goal.icon || (goal.goal_type === "savings" ? <PiggyBank className="w-4 h-4" /> : <Target className="w-4 h-4" />)}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
            {goal.name}
          </h4>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {formatCurrency(Math.abs(goal.current_amount))} / {formatCurrency(goal.target_amount)}
          </p>
        </div>
        <span className={`text-sm font-bold ${
          goal.progress_percentage >= 100
            ? "text-green-600 dark:text-green-400"
            : "text-gray-900 dark:text-gray-100"
        }`}>
          {Math.min(100, goal.progress_percentage).toFixed(0)}%
        </span>
      </div>
      <Progress value={Math.min(100, goal.progress_percentage)} className="h-1.5" />
    </div>
  );
}
