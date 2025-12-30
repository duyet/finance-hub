/**
 * CategoryCard Component
 *
 * Displays a single category with icon, budget progress, and stats
 */

import { CategoryWithStats } from "~/lib/db/categories.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import { MoreHorizontal, Trash2, Edit2, ChevronRight } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useNavigate } from "react-router";
import { cn } from "~/lib/utils";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { useState } from "react";

interface CategoryCardProps {
  category: CategoryWithStats;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * Color themes for category cards
 */
const colorThemes: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  red: { bg: "bg-red-50", border: "border-red-200", text: "text-red-900", iconBg: "bg-red-100" },
  pink: { bg: "bg-pink-50", border: "border-pink-200", text: "text-pink-900", iconBg: "bg-pink-100" },
  purple: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-900", iconBg: "bg-purple-100" },
  indigo: { bg: "bg-indigo-50", border: "border-indigo-200", text: "text-indigo-900", iconBg: "bg-indigo-100" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", iconBg: "bg-blue-100" },
  cyan: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-900", iconBg: "bg-cyan-100" },
  teal: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-900", iconBg: "bg-teal-100" },
  green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-900", iconBg: "bg-green-100" },
  lime: { bg: "bg-lime-50", border: "border-lime-200", text: "text-lime-900", iconBg: "bg-lime-100" },
  yellow: { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-900", iconBg: "bg-yellow-100" },
  orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-900", iconBg: "bg-orange-100" },
  brown: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", iconBg: "bg-amber-100" },
  gray: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-900", iconBg: "bg-gray-100" },
  slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-900", iconBg: "bg-slate-100" },
};

/**
 * Default colors for income/expense if no theme specified
 */
const defaultColors = {
  INCOME: { bg: "bg-green-50", border: "border-green-200", text: "text-green-900", iconBg: "bg-green-100" },
  EXPENSE: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-900", iconBg: "bg-orange-100" },
};

/**
 * Common category icons
 */
const defaultIcons: Record<string, string> = {
  salary: "💰",
  bonus: "🎁",
  investment: "📈",
  freelance: "💼",
  gift: "🎀",
  refund: "↩️",
  food: "🍔",
  groceries: "🛒",
  restaurant: "🍽️",
  coffee: "☕",
  transport: "🚗",
  gas: "⛽",
  parking: "🅿️",
  shopping: "🛍️",
  clothing: "👕",
  electronics: "📱",
  utilities: "💡",
  rent: "🏠",
  insurance: "🛡️",
  entertainment: "🎬",
  games: "🎮",
  music: "🎵",
  health: "🏥",
  pharmacy: "💊",
  education: "📚",
  travel: "✈️",
  pets: "🐕",
  fitness: "💪",
};

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  // Get color theme
  const theme = category.color_theme
    ? colorThemes[category.color_theme] || defaultColors[category.type]
    : defaultColors[category.type];

  // Get icon
  const icon =
    category.icon ||
    defaultIcons[category.name.toLowerCase()] ||
    (category.type === "INCOME" ? "💵" : "💸");

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Budget status
  const budgetStatus =
    category.budget_limit && category.budget_usage_percentage !== null
      ? category.budget_usage_percentage > 100
        ? "over"
        : category.budget_usage_percentage > 80
        ? "warning"
        : "good"
      : null;

  const budgetStatusColor =
    budgetStatus === "over"
      ? "bg-red-500"
      : budgetStatus === "warning"
      ? "bg-yellow-500"
      : "bg-green-500";

  return (
    <Card
      className={cn(
        "relative transition-all hover:shadow-md cursor-pointer border-2",
        theme.bg,
        theme.border
      )}
      onClick={() => navigate(`/categories/${category.id}`)}
    >
      {/* Header with Icon and Actions */}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Icon */}
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl", theme.iconBg)}>
              {icon}
            </div>

            {/* Title and Type */}
            <div className="flex-1">
              <CardTitle className={cn("text-lg font-semibold", theme.text)}>
                {category.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-0.5 rounded-full",
                    category.type === "INCOME"
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  )}
                >
                  {category.type === "INCOME" ? "Income" : "Expense"}
                </span>
                {category.is_system && (
                  <span className="text-xs text-gray-500">System</span>
                )}
                {category.parent_name && (
                  <span className="text-xs text-gray-500">→ {category.parent_name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                <ChevronRight className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {onEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(category.id); }}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && !category.is_system && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setCategoryToDelete(category.id);
                      setIsDeleteDialogOpen(true);
                    }}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="space-y-3">
        {/* Budget Progress (for expense categories with budget) */}
        {category.type === "EXPENSE" && category.budget_limit && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className={cn("font-medium", theme.text)}>Monthly Budget</span>
              <span className={cn("font-semibold", theme.text)}>
                {formatCurrency(category.monthly_spending)} / {formatCurrency(category.budget_limit)}
              </span>
            </div>
            <div className="relative">
              <Progress
                value={Math.min(category.budget_usage_percentage || 0, 100)}
                className="h-2"
              />
              {/* Over budget indicator */}
              {budgetStatus === "over" && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            {budgetStatus && (
              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", theme.text)}>
                  {category.budget_usage_percentage?.toFixed(0)}% used
                </span>
                {budgetStatus === "over" && (
                  <span className="text-red-600 font-medium">
                    Over by {formatCurrency(category.monthly_spending - category.budget_limit)}
                  </span>
                )}
                {budgetStatus === "warning" && (
                  <span className="text-yellow-600 font-medium">Approaching limit</span>
                )}
                {budgetStatus === "good" && (
                  <span className="text-green-600 font-medium">On track</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* No budget set */}
        {category.type === "EXPENSE" && !category.budget_limit && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">This month:</span>{" "}
            <span className="font-semibold">{formatCurrency(category.monthly_spending)}</span>
          </div>
        )}

        {/* Income total */}
        {category.type === "INCOME" && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">This month:</span>{" "}
            <span className="font-semibold">{formatCurrency(category.monthly_spending)}</span>
          </div>
        )}

        {/* Stats Row */}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <span className="font-medium">{category.transaction_count}</span>
            <span>transactions</span>
          </div>
          {category.children_count > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <span className="font-medium">{category.children_count}</span>
              <span>subcategories</span>
            </div>
          )}
          {category.parent_name && (
            <div className="text-xs text-gray-500 italic">Subcategory</div>
          )}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      {onDelete && (
        <ConfirmDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
          title={`Delete Category "${category.name}"?`}
          description="Are you sure you want to delete this category? This action cannot be undone."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => {
            if (categoryToDelete) {
              onDelete(categoryToDelete);
              setCategoryToDelete(null);
            }
          }}
        />
      )}
    </Card>
  );
}

/**
 * Compact category card for smaller displays
 */
interface CategoryCardCompactProps {
  category: CategoryWithStats;
  onClick?: () => void;
}

export function CategoryCardCompact({ category, onClick }: CategoryCardCompactProps) {
  const theme = category.color_theme
    ? colorThemes[category.color_theme] || defaultColors[category.type]
    : defaultColors[category.type];

  const icon =
    category.icon ||
    defaultIcons[category.name.toLowerCase()] ||
    (category.type === "INCOME" ? "💵" : "💸");

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-sm",
        theme.bg,
        theme.border
      )}
      onClick={onClick}
    >
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-xl", theme.iconBg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{category.name}</div>
        <div className="text-xs text-gray-600">{category.transaction_count} transactions</div>
      </div>
      {category.budget_limit && category.budget_usage_percentage !== null && (
        <div className="text-xs font-medium text-gray-600">
          {category.budget_usage_percentage.toFixed(0)}%
        </div>
      )}
    </div>
  );
}
