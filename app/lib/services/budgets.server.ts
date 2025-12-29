/**
 * Budgets Service
 *
 * Aggregates budget data from categories with spending information
 * for centralized budget management and tracking.
 */

import type { D1Database } from "@cloudflare/workers-types";

/**
 * Budget data with spending information
 */
export interface BudgetData {
  id: string;
  name: string;
  icon: string | null;
  colorTheme: string | null;
  budgetLimit: number;
  monthlySpending: number;
  budgetUsagePercentage: number;
  remaining: number;
  status: "healthy" | "warning" | "critical" | "exceeded";
  transactionCount: number;
}

/**
 * Budget summary data
 */
export interface BudgetSummary {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  overallUsagePercentage: number;
  categoryCount: number;
  overBudgetCount: number;
  warningCount: number;
}

/**
 * Get all budgets for a user with spending data
 */
export async function getBudgets(
  db: D1Database,
  userId: string
): Promise<BudgetData[]> {
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  const result = await db
    .prepare(`
      SELECT
        c.id,
        c.name,
        c.icon,
        c.color_theme as colorTheme,
        c.budget_limit as budgetLimit,
        COALESCE(SUM(ABS(t.amount)), 0) as monthlySpending,
        COUNT(t.id) as transactionCount
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
        AND t.date >= ?
        AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
      WHERE c.user_id = ?
        AND c.budget_limit IS NOT NULL
        AND c.budget_limit > 0
        AND c.type = 'EXPENSE'
      GROUP BY c.id
      ORDER BY c.name
    `)
    .bind(currentMonthStart.toISOString(), userId)
    .all();

  const budgets = (result.results || []) as Array<{
    id: string;
    name: string;
    icon: string | null;
    colorTheme: string | null;
    budgetLimit: number;
    monthlySpending: number;
    transactionCount: number;
  }>;

  return budgets.map((budget) => {
    const budgetUsagePercentage = budget.budgetLimit > 0
      ? Math.round((budget.monthlySpending / budget.budgetLimit) * 100)
      : 0;

    const remaining = budget.budgetLimit - budget.monthlySpending;

    let status: BudgetData["status"] = "healthy";
    if (budgetUsagePercentage >= 100) {
      status = "exceeded";
    } else if (budgetUsagePercentage >= 90) {
      status = "critical";
    } else if (budgetUsagePercentage >= 80) {
      status = "warning";
    }

    return {
      id: budget.id,
      name: budget.name,
      icon: budget.icon,
      colorTheme: budget.colorTheme,
      budgetLimit: budget.budgetLimit,
      monthlySpending: budget.monthlySpending,
      budgetUsagePercentage,
      remaining,
      status,
      transactionCount: budget.transactionCount,
    };
  });
}

/**
 * Get budget summary for a user
 */
export async function getBudgetSummary(
  db: D1Database,
  userId: string
): Promise<BudgetSummary> {
  const budgets = await getBudgets(db, userId);

  const totalBudget = budgets.reduce((sum, b) => sum + b.budgetLimit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.monthlySpending, 0);
  const totalRemaining = budgets.reduce((sum, b) => sum + b.remaining, 0);
  const overallUsagePercentage = totalBudget > 0
    ? Math.round((totalSpent / totalBudget) * 100)
    : 0;

  const overBudgetCount = budgets.filter((b) => b.status === "exceeded").length;
  const warningCount = budgets.filter((b) => b.status === "warning" || b.status === "critical").length;

  return {
    totalBudget,
    totalSpent,
    totalRemaining,
    overallUsagePercentage,
    categoryCount: budgets.length,
    overBudgetCount,
    warningCount,
  };
}

/**
 * Get budget data for a single category
 */
export async function getCategoryBudget(
  db: D1Database,
  userId: string,
  categoryId: string
): Promise<BudgetData | null> {
  const budgets = await getBudgets(db, userId);
  return budgets.find((b) => b.id === categoryId) || null;
}

/**
 * Get budget history for a category (last 6 months)
 */
export async function getCategoryBudgetHistory(
  db: D1Database,
  userId: string,
  categoryId: string,
  months: number = 6
): Promise<Array<{
  month: string;
  spent: number;
  budget: number;
  percentage: number;
}>> {
  const result = await db
    .prepare(`
      SELECT
        c.budget_limit as budget,
        strftime('%Y-%m', t.date) as month,
        COALESCE(SUM(ABS(t.amount)), 0) as spent
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
        AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
        AND t.date >= date('now', '-${months} months')
      WHERE c.id = ? AND c.user_id = ?
      GROUP BY strftime('%Y-%m', t.date)
      ORDER BY month DESC
      LIMIT ?
    `)
    .bind(categoryId, userId, months)
    .all();

  const history = (result.results || []) as Array<{
    month: string;
    spent: number;
    budget: number;
  }>;

  return history.map((h) => ({
    month: h.month,
    spent: h.spent,
    budget: h.budget || 0,
    percentage: h.budget > 0 ? Math.round((h.spent / h.budget) * 100) : 0,
  }));
}
