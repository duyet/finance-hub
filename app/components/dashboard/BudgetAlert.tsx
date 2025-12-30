/**
 * BudgetAlert Component
 *
 * Displays alerts for categories that are approaching or exceeding budget limits.
 */

import { Card, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { AlertTriangle, DollarSign, ChevronRight } from "lucide-react";
import { Link } from "react-router";

export interface OverBudgetCategory {
  id: string;
  name: string;
  budget_limit: number;
  monthly_spending: number;
  budget_usage_percentage: number;
  icon?: string | null;
  color_theme?: string | null;
}

interface BudgetAlertProps {
  overBudgetCategories: OverBudgetCategory[];
  currency?: string;
}

export function BudgetAlert({ overBudgetCategories, currency = "VND" }: BudgetAlertProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter: Only show categories over 80% of budget
  const alertCategories = overBudgetCategories.filter(
    (c) => c.budget_usage_percentage >= 80
  );

  if (alertCategories.length === 0) {
    return null;
  }

  const overBudgetCount = alertCategories.filter((c) => c.budget_usage_percentage >= 100).length;
  const isAllOverBudget = overBudgetCount === alertCategories.length;

  return (
    <Card className={`border-l-4 ${isAllOverBudget ? "border-l-red-500 bg-red-50 dark:bg-red-950/20" : "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`p-2 rounded-full ${isAllOverBudget ? "bg-red-100 dark:bg-red-900/30" : "bg-yellow-100 dark:bg-yellow-900/30"}`}>
            <AlertTriangle className={`w-5 h-5 ${isAllOverBudget ? "text-red-600 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"}`} />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className={`font-semibold ${isAllOverBudget ? "text-red-900 dark:text-red-100" : "text-yellow-900 dark:text-yellow-100"}`}>
                  {isAllOverBudget ? "Budget Exceeded" : "Budget Alert"}
                </h3>
                <p className={`text-sm mt-1 ${isAllOverBudget ? "text-red-700 dark:text-red-300" : "text-yellow-700 dark:text-yellow-300"}`}>
                  {isAllOverBudget
                    ? `${overBudgetCount} categor${overBudgetCount === 1 ? "y has" : "ies have"} exceeded the monthly budget limit`
                    : `${alertCategories.length} categor${alertCategories.length === 1 ? "y is" : "ies are"} approaching budget limits`}
                </p>
              </div>

              <Badge variant={isAllOverBudget ? "destructive" : "secondary"} className={isAllOverBudget ? "" : "bg-yellow-200 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100"}>
                {isAllOverBudget ? "Action Required" : "Warning"}
              </Badge>
            </div>

            {/* Category List */}
            <div className="space-y-2 mt-4">
              {alertCategories.slice(0, 3).map((category) => {
                const isOverBudget = category.budget_usage_percentage >= 100;
                const remaining = category.budget_limit - category.monthly_spending;

                return (
                  <div
                    key={category.id}
                    className={`p-3 rounded-lg border ${
                      isOverBudget
                        ? "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800"
                        : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {category.icon ? (
                          <span className="text-lg">{category.icon}</span>
                        ) : (
                          <DollarSign className={`w-4 h-4 ${isOverBudget ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`} />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{category.name}</p>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                            <span>
                              Spent: {formatCurrency(category.monthly_spending)} / {formatCurrency(category.budget_limit)}
                            </span>
                            <span className={isOverBudget ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                              {category.budget_usage_percentage.toFixed(0)}% used
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {isOverBudget ? (
                          <div className="text-sm font-medium text-red-600 dark:text-red-400">
                            Over by {formatCurrency(Math.abs(remaining))}
                          </div>
                        ) : (
                          <div className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                            {formatCurrency(remaining)} left
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {alertCategories.length > 3 && (
                <div className="text-sm text-gray-600 dark:text-gray-400 pt-1">
                  And {alertCategories.length - 3} more categor{alertCategories.length - 3 === 1 ? "y" : "ies"}...
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-4">
              <Link to="/categories" className="flex-1">
                <Button
                  variant={isAllOverBudget ? "destructive" : "default"}
                  className="w-full"
                  size="sm"
                >
                  View Categories
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
