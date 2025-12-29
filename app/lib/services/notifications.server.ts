/**
 * Notifications Service
 *
 * Handles user notifications and reminders for financial events
 */

import type { D1Database } from "@cloudflare/workers-types";

// ============================================================================
// Types
// ============================================================================

export type NotificationType =
  | "reminder"
  | "alert"
  | "info"
  | "success"
  | "warning";

export type NotificationCategory =
  | "payment_due"
  | "recurring_transaction"
  | "budget_alert"
  | "goal_milestone"
  | "debt_payment"
  | "low_balance"
  | "large_expense"
  | "goal_deadline"
  | "custom";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory | null;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  isDismissed: boolean;
  actionRequired: boolean;
  dueDate: string | null;
  createdAt: string;
  readAt: string | null;
  dismissedAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  paymentDueReminderDays: number;
  budgetAlertThreshold: number;
  lowBalanceThreshold: number;
  largeExpenseThreshold: number;
  goalMilestoneReminder: boolean;
  recurringTransactionReminder: boolean;
  debtPaymentReminder: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  category?: NotificationCategory;
  title: string;
  message: string;
  linkUrl?: string;
  actionRequired?: boolean;
  dueDate?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationStats {
  total: number;
  unread: number;
  unreadActionRequired: number;
}

// ============================================================================
// Database Queries
// ============================================================================

/**
 * Create a new notification
 */
export async function createNotification(
  db: D1Database,
  input: CreateNotificationInput
): Promise<Notification> {
  const id = crypto.randomUUID();

  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  await db
    .prepare(
      `INSERT INTO notifications (
        id, user_id, type, category, title, message, link_url,
        action_required, due_date, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.userId,
      input.type,
      input.category || null,
      input.title,
      input.message,
      input.linkUrl || null,
      input.actionRequired ? 1 : 0,
      input.dueDate || null,
      metadataJson
    )
    .run();

  return getNotificationById(db, id);
}

/**
 * Get notification by ID
 */
export async function getNotificationById(
  db: D1Database,
  id: string
): Promise<Notification> {
  const result = await db
    .prepare(`SELECT * FROM notifications WHERE id = ?`)
    .bind(id)
    .first();

  if (!result) {
    throw new Error(`Notification not found: ${id}`);
  }

  return mapRowToNotification(result);
}

/**
 * Get notifications for a user with filters
 */
export async function getNotifications(
  db: D1Database,
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    includeRead?: boolean;
    includeDismissed?: boolean;
    type?: NotificationType;
    category?: NotificationCategory;
  } = {}
): Promise<{ notifications: Notification[]; total: number }> {
  const {
    limit = 50,
    offset = 0,
    includeRead = true,
    includeDismissed = false,
    type,
    category,
  } = options;

  const conditions = ["user_id = ?"];
  const params: Array<string | number> = [userId];

  if (!includeRead) {
    conditions.push("is_read = 0");
  }

  if (!includeDismissed) {
    conditions.push("is_dismissed = 0");
  }

  if (type) {
    conditions.push("type = ?");
    params.push(type);
  }

  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }

  const whereClause = conditions.join(" AND ");

  // Get total count
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM notifications WHERE ${whereClause}`)
    .bind(...params)
    .first();

  const total = countResult?.count ? Number(countResult.count) : 0;

  // Get notifications
  const results = await db
    .prepare(
      `SELECT * FROM notifications
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all();

  const notifications = (results.results || []).map(mapRowToNotification);

  return { notifications, total };
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(
  db: D1Database,
  userId: string,
  limit = 10
): Promise<Notification[]> {
  const results = await db
    .prepare(
      `SELECT * FROM notifications
       WHERE user_id = ? AND is_read = 0 AND is_dismissed = 0
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(userId, limit)
    .all();

  return (results.results || []).map(mapRowToNotification);
}

/**
 * Get notification statistics for a user
 */
export async function getNotificationStats(
  db: D1Database,
  userId: string
): Promise<NotificationStats> {
  const [totalResult, unreadResult, actionRequiredResult] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) as count FROM notifications
         WHERE user_id = ? AND is_dismissed = 0`
      )
      .bind(userId)
      .first(),
    db
      .prepare(
        `SELECT COUNT(*) as count FROM notifications
         WHERE user_id = ? AND is_read = 0 AND is_dismissed = 0`
      )
      .bind(userId)
      .first(),
    db
      .prepare(
        `SELECT COUNT(*) as count FROM notifications
         WHERE user_id = ? AND is_read = 0 AND action_required = 1 AND is_dismissed = 0`
      )
      .bind(userId)
      .first(),
  ]);

  return {
    total: totalResult?.count ? Number(totalResult.count) : 0,
    unread: unreadResult?.count ? Number(unreadResult.count) : 0,
    unreadActionRequired: actionRequiredResult?.count
      ? Number(actionRequiredResult.count)
      : 0,
  };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
  db: D1Database,
  notificationId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE notifications
       SET is_read = 1, read_at = datetime('now')
       WHERE id = ?`
    )
    .bind(notificationId)
    .run();
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(
  db: D1Database,
  userId: string
): Promise<number> {
  const result = await db
    .prepare(
      `UPDATE notifications
       SET is_read = 1, read_at = datetime('now')
       WHERE user_id = ? AND is_read = 0`
    )
    .bind(userId)
    .run();

  return result.meta.changes || 0;
}

/**
 * Dismiss notification
 */
export async function dismissNotification(
  db: D1Database,
  notificationId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE notifications
       SET is_dismissed = 1, dismissed_at = datetime('now')
       WHERE id = ?`
    )
    .bind(notificationId)
    .run();
}

/**
 * Delete notification
 */
export async function deleteNotification(
  db: D1Database,
  notificationId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM notifications WHERE id = ? AND user_id = ?`)
    .bind(notificationId, userId)
    .run();

  return (result.meta.changes || 0) > 0;
}

/**
 * Clean up old read/dismissed notifications
 */
export async function cleanupOldNotifications(
  db: D1Database,
  userId: string,
  olderThanDays = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffIso = cutoffDate.toISOString();

  const result = await db
    .prepare(
      `DELETE FROM notifications
       WHERE user_id = ?
       AND (is_read = 1 OR is_dismissed = 1)
       AND created_at < ?`
    )
    .bind(userId, cutoffIso)
    .run();

  return result.meta.changes || 0;
}

// ============================================================================
// Notification Preferences
// ============================================================================

/**
 * Get notification preferences for a user
 */
export async function getNotificationPreferences(
  db: D1Database,
  userId: string
): Promise<NotificationPreference | null> {
  const result = await db
    .prepare(`SELECT * FROM notification_preferences WHERE user_id = ?`)
    .bind(userId)
    .first();

  if (!result) {
    // Create default preferences
    return createDefaultPreferences(db, userId);
  }

  return mapRowToPreference(result);
}

/**
 * Create default notification preferences for a user
 */
async function createDefaultPreferences(
  db: D1Database,
  userId: string
): Promise<NotificationPreference> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO notification_preferences (
        id, user_id, email_enabled, push_enabled, in_app_enabled,
        payment_due_reminder_days, budget_alert_threshold,
        low_balance_threshold, large_expense_threshold,
        goal_milestone_reminder, recurring_transaction_reminder, debt_payment_reminder
      ) VALUES (?, ?, 1, 1, 1, 3, 0.8, 1000.0, 5000000.0, 1, 1, 1)`
    )
    .bind(id, userId)
    .run();

  return getNotificationPreferences(db, userId);
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  db: D1Database,
  userId: string,
  updates: Partial<Omit<NotificationPreference, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<NotificationPreference> {
  const fields: string[] = [];
  const params: Array<string | number | boolean> = [];

  if (updates.emailEnabled !== undefined) {
    fields.push("email_enabled = ?");
    params.push(updates.emailEnabled ? 1 : 0);
  }
  if (updates.pushEnabled !== undefined) {
    fields.push("push_enabled = ?");
    params.push(updates.pushEnabled ? 1 : 0);
  }
  if (updates.inAppEnabled !== undefined) {
    fields.push("in_app_enabled = ?");
    params.push(updates.inAppEnabled ? 1 : 0);
  }
  if (updates.paymentDueReminderDays !== undefined) {
    fields.push("payment_due_reminder_days = ?");
    params.push(updates.paymentDueReminderDays);
  }
  if (updates.budgetAlertThreshold !== undefined) {
    fields.push("budget_alert_threshold = ?");
    params.push(updates.budgetAlertThreshold);
  }
  if (updates.lowBalanceThreshold !== undefined) {
    fields.push("low_balance_threshold = ?");
    params.push(updates.lowBalanceThreshold);
  }
  if (updates.largeExpenseThreshold !== undefined) {
    fields.push("large_expense_threshold = ?");
    params.push(updates.largeExpenseThreshold);
  }
  if (updates.goalMilestoneReminder !== undefined) {
    fields.push("goal_milestone_reminder = ?");
    params.push(updates.goalMilestoneReminder ? 1 : 0);
  }
  if (updates.recurringTransactionReminder !== undefined) {
    fields.push("recurring_transaction_reminder = ?");
    params.push(updates.recurringTransactionReminder ? 1 : 0);
  }
  if (updates.debtPaymentReminder !== undefined) {
    fields.push("debt_payment_reminder = ?");
    params.push(updates.debtPaymentReminder ? 1 : 0);
  }

  if (fields.length === 0) {
    return getNotificationPreferences(db, userId);
  }

  fields.push("updated_at = datetime('now')");
  params.push(userId);

  await db
    .prepare(`UPDATE notification_preferences SET ${fields.join(", ")} WHERE user_id = ?`)
    .bind(...params)
    .run();

  return getNotificationPreferences(db, userId);
}

// ============================================================================
// Notification Generators
// ============================================================================

/**
 * Create payment due reminder
 */
export async function createPaymentDueReminder(
  db: D1Database,
  userId: string,
  accountId: string,
  accountName: string,
  dueDate: string,
  minimumPayment: number,
  currency: string = "VND"
): Promise<Notification> {
  const formatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return createNotification(db, {
    userId,
    type: "reminder",
    category: "payment_due",
    title: `Payment Due: ${accountName}`,
    message: `Your minimum payment of ${formatter.format(minimumPayment)} is due on ${new Date(dueDate).toLocaleDateString()}.`,
    linkUrl: `/accounts/${accountId}`,
    actionRequired: true,
    dueDate,
    metadata: {
      accountId,
      minimumPayment,
      currency,
    },
  });
}

/**
 * Create budget alert
 */
export async function createBudgetAlert(
  db: D1Database,
  userId: string,
  categoryId: string,
  categoryName: string,
  spent: number,
  budget: number,
  percentage: number,
  currency: string = "VND"
): Promise<Notification> {
  const formatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const categoryType = percentage >= 100 ? "alert" : "warning";
  const title =
    percentage >= 100
      ? `Budget Exceeded: ${categoryName}`
      : `Budget Alert: ${categoryName}`;

  return createNotification(db, {
    userId,
    type: categoryType,
    category: "budget_alert",
    title,
    message: `You've spent ${formatter.format(spent)} of ${formatter.format(budget)} (${percentage.toFixed(0)}%) in ${categoryName}.`,
    linkUrl: "/budgets",
    actionRequired: percentage >= 100,
    metadata: {
      categoryId,
      categoryName,
      spent,
      budget,
      percentage,
      currency,
    },
  });
}

/**
 * Create goal milestone notification
 */
export async function createGoalMilestoneNotification(
  db: D1Database,
  userId: string,
  goalId: string,
  goalName: string,
  currentAmount: number,
  targetAmount: number,
  percentage: number,
  milestone: number,
  currency: string = "VND"
): Promise<Notification> {
  const formatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return createNotification(db, {
    userId,
    type: "success",
    category: "goal_milestone",
    title: `🎉 Milestone Achieved: ${goalName}`,
    message: `You've reached ${mileage}% of your goal! ${formatter.format(currentAmount)} of ${formatter.format(targetAmount)}.`,
    linkUrl: "/goals",
    metadata: {
      goalId,
      goalName,
      currentAmount,
      targetAmount,
      percentage,
      currency,
    },
  });
}

/**
 * Create recurring transaction reminder
 */
export async function createRecurringTransactionReminder(
  db: D1Database,
  userId: string,
  transactionId: string,
  transactionName: string,
  amount: number,
  nextDate: string,
  currency: string = "VND"
): Promise<Notification> {
  const formatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return createNotification(db, {
    userId,
    type: "reminder",
    category: "recurring_transaction",
    title: `Recurring Transaction: ${transactionName}`,
    message: `Your recurring transaction of ${formatter.format(amount)} is scheduled for ${new Date(nextDate).toLocaleDateString()}.`,
    linkUrl: `/transactions`,
    actionRequired: false,
    dueDate: nextDate,
    metadata: {
      transactionId,
      transactionName,
      amount,
      currency,
    },
  });
}

/**
 * Create debt payment reminder
 */
export async function createDebtPaymentReminder(
  db: D1Database,
  userId: string,
  debtId: string,
  debtName: string,
  minimumPayment: number,
  dueDate: string,
  currency: string = "VND"
): Promise<Notification> {
  const formatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return createNotification(db, {
    userId,
    type: "reminder",
    category: "debt_payment",
    title: `Debt Payment Due: ${debtName}`,
    message: `Your debt payment of ${formatter.format(minimumPayment)} is due on ${new Date(dueDate).toLocaleDateString()}.`,
    linkUrl: "/debt-planner",
    actionRequired: true,
    dueDate,
    metadata: {
      debtId,
      debtName,
      minimumPayment,
      currency,
    },
  });
}

/**
 * Create low balance alert
 */
export async function createLowBalanceAlert(
  db: D1Database,
  userId: string,
  accountId: string,
  accountName: string,
  currentBalance: number,
  threshold: number,
  currency: string = "VND"
): Promise<Notification> {
  const formatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return createNotification(db, {
    userId,
    type: "warning",
    category: "low_balance",
    title: `Low Balance: ${accountName}`,
    message: `Your balance in ${accountName} is ${formatter.format(currentBalance)}, below your threshold of ${formatter.format(threshold)}.`,
    linkUrl: `/accounts/${accountId}`,
    actionRequired: false,
    metadata: {
      accountId,
      accountName,
      currentBalance,
      threshold,
      currency,
    },
  });
}

/**
 * Create large expense alert
 */
export async function createLargeExpenseAlert(
  db: D1Database,
  userId: string,
  transactionId: string,
  transactionName: string,
  amount: number,
  threshold: number,
  currency: string = "VND"
): Promise<Notification> {
  const formatter = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return createNotification(db, {
    userId,
    type: "warning",
    category: "large_expense",
    title: `Large Expense: ${transactionName}`,
    message: `You've made a large expense of ${formatter.format(amount)} (threshold: ${formatter.format(threshold)}).`,
    linkUrl: `/transactions/${transactionId}`,
    actionRequired: false,
    metadata: {
      transactionId,
      transactionName,
      amount,
      threshold,
      currency,
    },
  });
}

// ============================================================================
// Helpers
// ============================================================================

function mapRowToNotification(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: row.type as NotificationType,
    category: row.category as NotificationCategory | null,
    title: String(row.title),
    message: String(row.message),
    linkUrl: row.link_url ? String(row.link_url) : null,
    isRead: Boolean(row.is_read),
    isDismissed: Boolean(row.is_dismissed),
    actionRequired: Boolean(row.action_required),
    dueDate: row.due_date ? String(row.due_date) : null,
    createdAt: String(row.created_at),
    readAt: row.read_at ? String(row.read_at) : null,
    dismissedAt: row.dismissed_at ? String(row.dismissed_at) : null,
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : null,
  };
}

function mapRowToPreference(row: Record<string, unknown>): NotificationPreference {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    emailEnabled: Boolean(row.email_enabled),
    pushEnabled: Boolean(row.push_enabled),
    inAppEnabled: Boolean(row.in_app_enabled),
    paymentDueReminderDays: Number(row.payment_due_reminder_days),
    budgetAlertThreshold: Number(row.budget_alert_threshold),
    lowBalanceThreshold: Number(row.low_balance_threshold),
    largeExpenseThreshold: Number(row.large_expense_threshold),
    goalMilestoneReminder: Boolean(row.goal_milestone_reminder),
    recurringTransactionReminder: Boolean(row.recurring_transaction_reminder),
    debtPaymentReminder: Boolean(row.debt_payment_reminder),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}
