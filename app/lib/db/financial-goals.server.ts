/**
 * Financial Goals Service
 *
 * Manage savings goals, debt payoff targets, and expense limits.
 * Supports auto-tracking via transaction categories.
 */

import type { D1Database } from "@cloudflare/workers-types";

/**
 * Goal database row
 */
export interface FinancialGoalRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  category_id: string | null;
  goal_type: "savings" | "debt_payoff" | "expense_limit";
  target_date: string | null;
  start_date: string;
  status: "active" | "completed" | "paused" | "cancelled";
  priority: number;
  icon: string | null;
  color_theme: string | null;
  auto_track: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/**
 * Goal with calculated progress
 */
export interface FinancialGoalWithProgress extends FinancialGoalRow {
  progress_percentage: number;
  remaining_amount: number;
  days_remaining: number | null;
  on_track: boolean | null;
  monthly_contribution_needed: number | null;
  category_name: string | null;
}

/**
 * Goal summary for dashboard
 */
export interface GoalsSummary {
  total_goals: number;
  active_goals: number;
  completed_goals: number;
  total_target_amount: number;
  total_saved_amount: number;
  goals_near_target: number;        // Within 10% of target
  overdue_goals: number;             // Past target date and not completed
}

/**
 * Create goal input
 */
export interface CreateGoalInput {
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount?: number;
  categoryId?: string | null;
  goalType: "savings" | "debt_payoff" | "expense_limit";
  targetDate?: string | null;
  startDate?: string;
  priority?: number;
  icon?: string | null;
  colorTheme?: string | null;
  autoTrack?: boolean;
}

/**
 * Update goal input
 */
export interface UpdateGoalInput extends Partial<CreateGoalInput> {
  status?: "active" | "completed" | "paused" | "cancelled";
}

/**
 * Goals CRUD operations
 */
export const goalsCrud = {
  /**
   * Get all goals for user with progress calculations
   */
  async getGoals(
    db: D1Database,
    userId: string,
    filters: { status?: FinancialGoalRow["status"]; type?: FinancialGoalRow["goal_type"] } = {}
  ): Promise<FinancialGoalWithProgress[]> {
    let query = `
      SELECT
        g.*,
        c.name as category_name,
        CASE
          WHEN g.target_amount > 0
          THEN ROUND((g.current_amount * 100.0 / g.target_amount), 2)
          ELSE 0
        END as progress_percentage,
        g.target_amount - g.current_amount as remaining_amount,
        CASE
          WHEN g.target_date IS NOT NULL
          THEN CAST(julianday(g.target_date) - julianday('now') AS INTEGER)
          ELSE NULL
        END as days_remaining,
        CASE
          WHEN g.target_date IS NOT NULL AND g.target_amount > 0
          THEN (
            g.current_amount >= (g.target_amount * 0.9) OR
            g.current_amount >= (
              g.target_amount *
              CAST(julianday('now') - julianday(g.start_date) AS REAL) /
              GREATEST(CAST(julianday(g.target_date) - julianday(g.start_date) AS REAL), 1)
            )
          )
          ELSE NULL
        END as on_track,
        CASE
          WHEN g.target_date IS NOT NULL AND g.target_amount > g.current_amount
          THEN ROUND(
            (g.target_amount - g.current_amount) /
            GREATEST(CAST(julianday(g.target_date) - julianday('now') AS REAL), 1)
          , 2)
          ELSE NULL
        END as monthly_contribution_needed
      FROM financial_goals g
      LEFT JOIN categories c ON g.category_id = c.id
      WHERE g.user_id = ?
    `;

    const params: (string | number)[] = [userId];

    if (filters.status) {
      query += ` AND g.status = ?`;
      params.push(filters.status);
    }

    if (filters.type) {
      query += ` AND g.goal_type = ?`;
      params.push(filters.type);
    }

    query += ` ORDER BY g.priority DESC, g.target_date ASC`;

    const result = await db.prepare(query).bind(...params).all();

    return (result.results || []) as FinancialGoalWithProgress[];
  },

  /**
   * Get goal by ID
   */
  async getGoalById(
    db: D1Database,
    id: string,
    userId: string
  ): Promise<FinancialGoalWithProgress | null> {
    const goals = await this.getGoals(db, userId);
    return goals.find((g) => g.id === id) || null;
  },

  /**
   * Create new goal
   */
  async createGoal(
    db: D1Database,
    userId: string,
    data: CreateGoalInput
  ): Promise<FinancialGoalRow> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const result = await db
      .prepare(
        `INSERT INTO financial_goals (
          id, user_id, name, description, target_amount, current_amount,
          category_id, goal_type, target_date, start_date, status,
          priority, icon, color_theme, auto_track, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        userId,
        data.name,
        data.description || null,
        data.targetAmount,
        data.currentAmount || 0,
        data.categoryId || null,
        data.goalType,
        data.targetDate || null,
        data.startDate || new Date().toISOString().split("T")[0],
        "active",
        data.priority || 0,
        data.icon || null,
        data.colorTheme || null,
        data.autoTrack !== undefined ? (data.autoTrack ? 1 : 0) : 1,
        now,
        now
      )
      .run();

    if (!result.success) {
      throw new Error("Failed to create financial goal");
    }

    const goals = await this.getGoals(db, userId);
    return goals.find((g) => g.id === id)!;
  },

  /**
   * Update existing goal
   */
  async updateGoal(
    db: D1Database,
    id: string,
    userId: string,
    data: UpdateGoalInput
  ): Promise<FinancialGoalRow | null> {
    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      params.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push("description = ?");
      params.push(data.description || null);
    }
    if (data.targetAmount !== undefined) {
      updates.push("target_amount = ?");
      params.push(data.targetAmount);
    }
    if (data.currentAmount !== undefined) {
      updates.push("current_amount = ?");
      params.push(data.currentAmount);
    }
    if (data.categoryId !== undefined) {
      updates.push("category_id = ?");
      params.push(data.categoryId || null);
    }
    if (data.goalType !== undefined) {
      updates.push("goal_type = ?");
      params.push(data.goalType);
    }
    if (data.targetDate !== undefined) {
      updates.push("target_date = ?");
      params.push(data.targetDate || null);
    }
    if (data.status !== undefined) {
      updates.push("status = ?");
      params.push(data.status);
      if (data.status === "completed") {
        updates.push("completed_at = ?");
        params.push(new Date().toISOString());
      }
    }
    if (data.priority !== undefined) {
      updates.push("priority = ?");
      params.push(data.priority);
    }
    if (data.icon !== undefined) {
      updates.push("icon = ?");
      params.push(data.icon || null);
    }
    if (data.colorTheme !== undefined) {
      updates.push("color_theme = ?");
      params.push(data.colorTheme || null);
    }
    if (data.autoTrack !== undefined) {
      updates.push("auto_track = ?");
      params.push(data.autoTrack ? 1 : 0);
    }

    if (updates.length === 0) return null;

    updates.push("updated_at = ?");
    params.push(new Date().toISOString());
    params.push(id);
    params.push(userId);

    const result = await db
      .prepare(`UPDATE financial_goals SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
      .bind(...params)
      .run();

    if (!result.success) {
      throw new Error("Failed to update financial goal");
    }

    return this.getGoalById(db, id, userId);
  },

  /**
   * Delete goal
   */
  async deleteGoal(
    db: D1Database,
    id: string,
    userId: string
  ): Promise<boolean> {
    const result = await db
      .prepare(`DELETE FROM financial_goals WHERE id = ? AND user_id = ?`)
      .bind(id, userId)
      .run();

    return result.success && (result.meta?.changes || 0) > 0;
  },

  /**
   * Get goals summary for dashboard
   */
  async getGoalsSummary(db: D1Database, userId: string): Promise<GoalsSummary> {
    const result = await db
      .prepare(
        `SELECT
          COUNT(*) as total_goals,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_goals,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_goals,
          SUM(target_amount) as total_target_amount,
          SUM(current_amount) as total_saved_amount,
          SUM(CASE
            WHEN status = 'active' AND
              current_amount >= (target_amount * 0.9)
            THEN 1 ELSE 0
          END) as goals_near_target,
          SUM(CASE
            WHEN status != 'completed' AND
              target_date < DATE('now')
            THEN 1 ELSE 0
          END) as overdue_goals
        FROM financial_goals
        WHERE user_id = ?`
      )
      .bind(userId)
      .first();

    return {
      totalGoals: (result?.total_goals as number) || 0,
      activeGoals: (result?.active_goals as number) || 0,
      completedGoals: (result?.completed_goals as number) || 0,
      totalTargetAmount: (result?.total_target_amount as number) || 0,
      totalSavedAmount: (result?.total_saved_amount as number) || 0,
      goalsNearTarget: (result?.goals_near_target as number) || 0,
      overdueGoals: (result?.overdue_goals as number) || 0,
    };
  },

  /**
   * Auto-track goals by updating current_amount from transactions
   * For savings goals: credit transactions to linked category
   * For debt payoff: debit transactions to linked category
   * For expense limits: subtract spending from target
   */
  async autoTrackGoals(db: D1Database, userId: string): Promise<void> {
    // Get all auto-track goals
    const goalsResult = await db
      .prepare(
        `SELECT id, goal_type, category_id, current_amount
         FROM financial_goals
         WHERE user_id = ? AND auto_track = 1 AND status = 'active' AND category_id IS NOT NULL`
      )
      .bind(userId)
      .all();

    const goals = (goalsResult.results || []) as Pick<FinancialGoalRow, "id" | "goal_type" | "category_id" | "current_amount">[];

    for (const goal of goals) {
      let newAmount = goal.current_amount;

      if (goal.goal_type === "savings") {
        // Credit transactions to category count toward savings
        const savingsResult = await db
          .prepare(
            `SELECT COALESCE(SUM(amount), 0) as total
             FROM transactions
             WHERE user_id = ? AND category_id = ? AND amount > 0`
          )
          .bind(userId, goal.category_id!)
          .first();

        newAmount = savingsResult?.total as number || 0;
      } else if (goal.goal_type === "debt_payoff") {
        // Debit payments (negative amounts) reduce debt
        const paymentsResult = await db
          .prepare(
            `SELECT COALESCE(SUM(ABS(amount)), 0) as total
             FROM transactions
             WHERE user_id = ? AND category_id = ? AND amount < 0`
          )
          .bind(userId, goal.category_id!)
          .first();

        newAmount = paymentsResult?.total as number || 0;
      } else if (goal.goal_type === "expense_limit") {
        // Current spending against limit (negative)
        const spendingResult = await db
          .prepare(
            `SELECT COALESCE(SUM(ABS(amount)), 0) as total
             FROM transactions
             WHERE user_id = ? AND category_id = ? AND amount < 0
               AND date >= DATE('now', 'start of month')`
          )
          .bind(userId, goal.category_id!)
          .first();

        // For expense limits, current_amount tracks how much of the limit is used
        newAmount = -(spendingResult?.total as number || 0);
      }

      // Update goal if amount changed
      if (newAmount !== goal.current_amount) {
        await db
          .prepare(
            `UPDATE financial_goals
             SET current_amount = ?, updated_at = ?
             WHERE id = ?`
          )
          .bind(newAmount, new Date().toISOString(), goal.id)
          .run();

        // Auto-complete if target reached
        const goalDetails = await db
          .prepare(`SELECT target_amount FROM financial_goals WHERE id = ?`)
          .bind(goal.id)
          .first();

        if (goalDetails && newAmount >= (goalDetails.target_amount as number)) {
          await db
            .prepare(
              `UPDATE financial_goals
               SET status = 'completed', completed_at = ?, updated_at = ?
               WHERE id = ? AND status = 'active'`
            )
            .bind(new Date().toISOString(), new Date().toISOString(), goal.id)
            .run();
        }
      }
    }
  },
};

/**
 * Helper: Get goals with category info for dashboard
 */
export async function getGoalsForDashboard(
  db: D1Database,
  userId: string
): Promise<{
  summary: GoalsSummary;
  topGoals: FinancialGoalWithProgress[];
}> {
  const [summary, allGoals] = await Promise.all([
    goalsCrud.getGoalsSummary(db, userId),
    goalsCrud.getGoals(db, userId, { status: "active" }),
  ]);

  // Get top 3 goals by priority or near completion
  const topGoals = allGoals
    .sort((a, b) => {
      // Prioritize goals near target
      const aNearTarget = a.progress_percentage >= 90;
      const bNearTarget = b.progress_percentage >= 90;
      if (aNearTarget && !bNearTarget) return -1;
      if (!aNearTarget && bNearTarget) return 1;

      // Then by priority
      if (b.priority !== a.priority) return b.priority - a.priority;

      // Then by deadline
      if (a.days_remaining !== null && b.days_remaining !== null) {
        return a.days_remaining - b.days_remaining;
      }

      return 0;
    })
    .slice(0, 3);

  return { summary, topGoals };
}
