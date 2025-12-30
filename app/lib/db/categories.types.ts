/**
 * Categories Types
 *
 * Shared types for categories that can be used in both server and client code.
 * Database operations are in categories.server.ts
 */

/**
 * Category row from database
 */
export interface CategoryRow {
  id: string;
  user_id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  parent_id: string | null;
  budget_limit: number | null;
  color_theme: string | null;
  icon: string | null;
  is_system: number;
  created_at: string;
  updated_at: string;
}

/**
 * Category with statistics
 */
export interface CategoryWithStats extends CategoryRow {
  transaction_count: number;
  monthly_spending: number;
  budget_usage_percentage: number | null;
  parent_name: string | null;
  children_count: number;
}

/**
 * Create category input
 */
export interface CreateCategoryInput {
  name: string;
  type: "INCOME" | "EXPENSE";
  parentId?: string | null;
  budgetLimit?: number | null;
  colorTheme?: string | null;
  icon?: string | null;
}

/**
 * Update category input
 */
export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {
  name?: string;
  type?: "INCOME" | "EXPENSE";
}

/**
 * Category filter options
 */
export interface CategoryFilters {
  type?: "INCOME" | "EXPENSE" | "ALL";
  parentId?: string | null;
  hasBudget?: boolean;
}
