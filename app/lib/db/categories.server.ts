/**
 * Categories data access layer
 * Provides CRUD operations for income/expense categories with budget tracking
 */

import type { D1Database } from "@cloudflare/workers-types";

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

/**
 * Categories CRUD operations
 */
export const categoriesCrud = {
  /**
   * Get all categories with statistics for current user
   */
  async getCategories(
    db: D1Database,
    userId: string,
    filters: CategoryFilters = {}
  ): Promise<CategoryWithStats[]> {
    const conditions: string[] = ["c.user_id = ?"];
    const params: (string | number)[] = [userId];

    // Build WHERE clause
    if (filters.type && filters.type !== "ALL") {
      conditions.push("c.type = ?");
      params.push(filters.type);
    }
    if (filters.parentId !== undefined) {
      if (filters.parentId === null) {
        conditions.push("c.parent_id IS NULL");
      } else {
        conditions.push("c.parent_id = ?");
        params.push(filters.parentId);
      }
    }
    if (filters.hasBudget) {
      conditions.push("c.budget_limit IS NOT NULL");
    }

    const whereClause = conditions.join(" AND ");

    // Get current month start for spending calculation
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const query = `
      SELECT
        c.*,
        COUNT(DISTINCT t.id) as transaction_count,
        COALESCE(
          CASE WHEN c.type = 'EXPENSE'
            THEN SUM(ABS(t.amount))
            ELSE SUM(t.amount)
          END, 0
        ) as monthly_spending,
        CASE
          WHEN c.budget_limit IS NOT NULL AND c.type = 'EXPENSE'
          THEN ROUND(
            (COALESCE(SUM(ABS(t.amount)), 0) * 100.0 / c.budget_limit),
            2
          )
          ELSE NULL
        END as budget_usage_percentage,
        p.name as parent_name,
        (SELECT COUNT(*) FROM categories cat WHERE cat.parent_id = c.id) as children_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      LEFT JOIN transactions t ON t.category_id = c.id
        AND t.date >= ?
        AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
      WHERE ${whereClause}
      GROUP BY c.id, p.name
      ORDER BY c.type DESC, c.name ASC
    `;

    const result = await db
      .prepare(query)
      .bind(currentMonthStart.toISOString(), ...params)
      .all<CategoryWithStats>();

    return result.results || [];
  },

  /**
   * Get category by ID with full details
   */
  async getCategoryById(
    db: D1Database,
    id: string,
    userId: string
  ): Promise<CategoryWithStats | null> {
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const query = `
      SELECT
        c.*,
        COUNT(DISTINCT t.id) as transaction_count,
        COALESCE(
          CASE WHEN c.type = 'EXPENSE'
            THEN SUM(ABS(t.amount))
            ELSE SUM(t.amount)
          END, 0
        ) as monthly_spending,
        CASE
          WHEN c.budget_limit IS NOT NULL AND c.type = 'EXPENSE'
          THEN ROUND(
            (COALESCE(SUM(ABS(t.amount)), 0) * 100.0 / c.budget_limit),
            2
          )
          ELSE NULL
        END as budget_usage_percentage,
        p.name as parent_name,
        (SELECT COUNT(*) FROM categories cat WHERE cat.parent_id = c.id) as children_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      LEFT JOIN transactions t ON t.category_id = c.id
        AND t.date >= ?
        AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
      WHERE c.id = ? AND c.user_id = ?
      GROUP BY c.id, p.name
    `;

    const result = await db
      .prepare(query)
      .bind(currentMonthStart.toISOString(), id, userId)
      .first<CategoryWithStats>();

    return result || null;
  },

  /**
   * Get categories tree structure
   */
  async getCategoriesTree(
    db: D1Database,
    userId: string,
    type?: "INCOME" | "EXPENSE"
  ): Promise<CategoryWithStats[]> {
    const conditions: string[] = ["c.user_id = ?", "c.parent_id IS NULL"];
    const params: (string | number)[] = [userId];

    if (type) {
      conditions.push("c.type = ?");
      params.push(type);
    }

    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const query = `
      SELECT
        c.*,
        COUNT(DISTINCT t.id) as transaction_count,
        COALESCE(
          CASE WHEN c.type = 'EXPENSE'
            THEN SUM(ABS(t.amount))
            ELSE SUM(t.amount)
          END, 0
        ) as monthly_spending,
        CASE
          WHEN c.budget_limit IS NOT NULL AND c.type = 'EXPENSE'
          THEN ROUND(
            (COALESCE(SUM(ABS(t.amount)), 0) * 100.0 / c.budget_limit),
            2
          )
          ELSE NULL
        END as budget_usage_percentage,
        NULL as parent_name,
        (SELECT COUNT(*) FROM categories cat WHERE cat.parent_id = c.id) as children_count
      FROM categories c
      LEFT JOIN transactions t ON t.category_id = c.id
        AND t.date >= ?
        AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
      WHERE ${conditions.join(" AND ")}
      GROUP BY c.id
      ORDER BY c.type DESC, c.name ASC
    `;

    const result = await db
      .prepare(query)
      .bind(currentMonthStart.toISOString(), ...params)
      .all<CategoryWithStats>();

    return result.results || [];
  },

  /**
   * Get child categories for a parent
   */
  async getChildCategories(
    db: D1Database,
    parentId: string,
    userId: string
  ): Promise<CategoryWithStats[]> {
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const query = `
      SELECT
        c.*,
        COUNT(DISTINCT t.id) as transaction_count,
        COALESCE(
          CASE WHEN c.type = 'EXPENSE'
            THEN SUM(ABS(t.amount))
            ELSE SUM(t.amount)
          END, 0
        ) as monthly_spending,
        CASE
          WHEN c.budget_limit IS NOT NULL AND c.type = 'EXPENSE'
          THEN ROUND(
            (COALESCE(SUM(ABS(t.amount)), 0) * 100.0 / c.budget_limit),
            2
          )
          ELSE NULL
        END as budget_usage_percentage,
        p.name as parent_name,
        (SELECT COUNT(*) FROM categories cat WHERE cat.parent_id = c.id) as children_count
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      LEFT JOIN transactions t ON t.category_id = c.id
        AND t.date >= ?
        AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
      WHERE c.parent_id = ? AND c.user_id = ?
      GROUP BY c.id, p.name
      ORDER BY c.name ASC
    `;

    const result = await db
      .prepare(query)
      .bind(currentMonthStart.toISOString(), parentId, userId)
      .all<CategoryWithStats>();

    return result.results || [];
  },

  /**
   * Create new category
   */
  async createCategory(
    db: D1Database,
    userId: string,
    data: CreateCategoryInput
  ): Promise<CategoryWithStats> {
    const id = crypto.randomUUID();

    // Validate parent exists and belongs to user
    if (data.parentId) {
      const parent = await db
        .prepare("SELECT id FROM categories WHERE id = ? AND user_id = ?")
        .bind(data.parentId, userId)
        .first<{ id: string }>();

      if (!parent) {
        throw new Error("Parent category not found");
      }
    }

    await db
      .prepare(
        `INSERT INTO categories (
          id, user_id, name, type, parent_id, budget_limit, color_theme, icon
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        data.name,
        data.type,
        data.parentId || null,
        data.budgetLimit || null,
        data.colorTheme || null,
        data.icon || null
      )
      .run();

    const category = await categoriesCrud.getCategoryById(db, id, userId);
    if (!category) {
      throw new Error("Failed to create category");
    }
    return category;
  },

  /**
   * Update category
   */
  async updateCategory(
    db: D1Database,
    id: string,
    userId: string,
    data: UpdateCategoryInput
  ): Promise<CategoryWithStats | null> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.type !== undefined) {
      updates.push("type = ?");
      params.push(data.type);
    }
    if (data.parentId !== undefined) {
      if (data.parentId === null) {
        updates.push("parent_id = NULL");
      } else {
        // Validate parent exists and belongs to user
        const parent = await db
          .prepare("SELECT id FROM categories WHERE id = ? AND user_id = ?")
          .bind(data.parentId, userId)
          .first<{ id: string }>();

        if (!parent) {
          throw new Error("Parent category not found");
        }

        // Prevent circular reference
        if (data.parentId === id) {
          throw new Error("Category cannot be its own parent");
        }

        updates.push("parent_id = ?");
        params.push(data.parentId);
      }
    }
    if (data.budgetLimit !== undefined) {
      updates.push("budget_limit = ?");
      params.push(data.budgetLimit);
    }
    if (data.colorTheme !== undefined) {
      updates.push("color_theme = ?");
      params.push(data.colorTheme);
    }
    if (data.icon !== undefined) {
      updates.push("icon = ?");
      params.push(data.icon);
    }

    if (updates.length === 0) {
      return categoriesCrud.getCategoryById(db, id, userId);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id, userId);

    await db
      .prepare(`UPDATE categories SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
      .bind(...params)
      .run();

    return categoriesCrud.getCategoryById(db, id, userId);
  },

  /**
   * Delete category (soft delete by setting is_archived if needed, or hard delete)
   * Note: This is a hard delete - transactions with this category will have category_id set to NULL
   */
  async deleteCategory(db: D1Database, id: string, userId: string): Promise<boolean> {
    // First, update all transactions with this category to set category_id to NULL
    await db
      .prepare("UPDATE transactions SET category_id = NULL WHERE category_id = ? AND user_id = ?")
      .bind(id, userId)
      .run();

    // Then delete child categories
    await db
      .prepare("DELETE FROM categories WHERE parent_id = ? AND user_id = ?")
      .bind(id, userId)
      .run();

    // Finally delete the category
    const result = await db
      .prepare("DELETE FROM categories WHERE id = ? AND user_id = ?")
      .bind(id, userId)
      .run();

    return (result.meta?.changes || 0) > 0;
  },

  /**
   * Get parent category options for dropdown
   */
  async getParentOptions(
    db: D1Database,
    userId: string,
    type: "INCOME" | "EXPENSE",
    excludeId?: string
  ): Promise<Array<{ id: string; name: string }>> {
    let query = `
      SELECT id, name
      FROM categories
      WHERE user_id = ? AND type = ? AND parent_id IS NULL
    `;
    const params: (string | number)[] = [userId, type];

    if (excludeId) {
      query += " AND id != ?";
      params.push(excludeId);
    }

    query += " ORDER BY name ASC";

    const result = await db
      .prepare(query)
      .bind(...params)
      .all<{ id: string; name: string }>();

    return result.results || [];
  },

  /**
   * Get categories summary for dashboard
   */
  async getCategoriesSummary(
    db: D1Database,
    userId: string
  ): Promise<{
    totalCategories: number;
    incomeCategories: number;
    expenseCategories: number;
    categoriesWithBudgets: number;
    overBudgetCategories: number;
  }> {
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const [totalResult, incomeResult, expenseResult, budgetResult, overBudgetResult] =
      await Promise.all([
        db
          .prepare("SELECT COUNT(*) as count FROM categories WHERE user_id = ?")
          .bind(userId)
          .first<{ count: number }>(),
        db
          .prepare("SELECT COUNT(*) as count FROM categories WHERE user_id = ? AND type = 'INCOME'")
          .bind(userId)
          .first<{ count: number }>(),
        db
          .prepare("SELECT COUNT(*) as count FROM categories WHERE user_id = ? AND type = 'EXPENSE'")
          .bind(userId)
          .first<{ count: number }>(),
        db
          .prepare("SELECT COUNT(*) as count FROM categories WHERE user_id = ? AND budget_limit IS NOT NULL")
          .bind(userId)
          .first<{ count: number }>(),
        db
          .prepare(`
            SELECT COUNT(DISTINCT c.id) as count
            FROM categories c
            LEFT JOIN transactions t ON t.category_id = c.id
              AND t.date >= ?
              AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
            WHERE c.user_id = ?
              AND c.budget_limit IS NOT NULL
              AND c.type = 'EXPENSE'
            GROUP BY c.id
            HAVING SUM(ABS(t.amount)) > c.budget_limit
          `)
          .bind(currentMonthStart.toISOString(), userId)
          .all<{ count: number }>(),
      ]);

    return {
      totalCategories: totalResult?.count || 0,
      incomeCategories: incomeResult?.count || 0,
      expenseCategories: expenseResult?.count || 0,
      categoriesWithBudgets: budgetResult?.count || 0,
      overBudgetCategories: overBudgetResult.results?.length || 0,
    };
  },

  /**
   * Get categories that are approaching or exceeding budget limits
   * Returns categories with budget_usage_percentage >= 80% for alerts
   */
  async getOverBudgetCategories(db: D1Database, userId: string): Promise<Array<{
    id: string;
    name: string;
    budget_limit: number;
    monthly_spending: number;
    budget_usage_percentage: number;
    icon: string | null;
    color_theme: string | null;
  }>> {
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);

    const result = await db
      .prepare(`
        SELECT
          c.id,
          c.name,
          c.budget_limit,
          c.icon,
          c.color_theme,
          COALESCE(SUM(ABS(t.amount)), 0) as monthly_spending,
          CASE
            WHEN c.budget_limit > 0
            THEN ROUND((COALESCE(SUM(ABS(t.amount)), 0) * 100.0 / c.budget_limit), 2)
            ELSE NULL
          END as budget_usage_percentage
        FROM categories c
        LEFT JOIN transactions t ON t.category_id = c.id
          AND t.date >= ?
          AND t.status IN ('POSTED', 'CLEARED', 'RECONCILED')
        WHERE c.user_id = ?
          AND c.budget_limit IS NOT NULL
          AND c.type = 'EXPENSE'
        GROUP BY c.id
        HAVING budget_usage_percentage >= 80
        ORDER BY budget_usage_percentage DESC
      `)
      .bind(currentMonthStart.toISOString(), userId)
      .all();

    return (result.results || []) as Array<{
      id: string;
      name: string;
      budget_limit: number;
      monthly_spending: number;
      budget_usage_percentage: number;
      icon: string | null;
      color_theme: string | null;
    }>;
  },
};
