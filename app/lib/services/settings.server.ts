/**
 * Settings Server Utilities
 *
 * Handles dashboard configuration for users.
 */

import type { D1Database } from "@cloudflare/workers-types";

/**
 * Dashboard configuration data
 */
export interface DashboardConfig {
  showFinancialHealth: boolean;
  showFinancialGoals: boolean;
  showIncomeExpenseChart: boolean;
  showExpenseBreakdownChart: boolean;
  showAIInsights: boolean;
  showQuickActions: boolean;
}

/**
 * Default dashboard configuration
 */
const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  showFinancialHealth: true,
  showFinancialGoals: true,
  showIncomeExpenseChart: true,
  showExpenseBreakdownChart: true,
  showAIInsights: true,
  showQuickActions: true,
};

/**
 * Get dashboard configuration
 */
export async function getDashboardConfig(db: D1Database, userId: string): Promise<DashboardConfig> {
  const result = await db
    .prepare(`SELECT COALESCE(dashboard_config, ?) as config FROM users WHERE id = ?`)
    .bind(JSON.stringify(DEFAULT_DASHBOARD_CONFIG), userId)
    .first<{ config: string }>();

  if (!result?.config) {
    return DEFAULT_DASHBOARD_CONFIG;
  }

  try {
    const parsed = JSON.parse(result.config);
    return { ...DEFAULT_DASHBOARD_CONFIG, ...parsed };
  } catch {
    return DEFAULT_DASHBOARD_CONFIG;
  }
}
