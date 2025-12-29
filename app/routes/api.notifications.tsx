/**
 * Notifications API Endpoints
 *
 * Handles notification CRUD operations
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import {
  getNotifications,
  getNotificationStats,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  dismissNotification,
  deleteNotification,
  cleanupOldNotifications,
  getNotificationPreferences,
  updateNotificationPreferences,
  type CreateNotificationInput,
} from "~/lib/services/notifications.server";

/**
 * GET /api/notifications - Get notifications and stats
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const url = new URL(request.url);

  const action = url.searchParams.get("action");

  // Get notification stats
  if (action === "stats") {
    const stats = await getNotificationStats(db, user.id);
    return json({ stats });
  }

  // Get notification preferences
  if (action === "preferences") {
    const preferences = await getNotificationPreferences(db, user.id);
    return json({ preferences });
  }

  // Get notifications list
  const type = url.searchParams.get("type") as
    | "reminder"
    | "alert"
    | "info"
    | "success"
    | "warning"
    | null;
  const category = url.searchParams.get("category") as
    | "payment_due"
    | "recurring_transaction"
    | "budget_alert"
    | "goal_milestone"
    | "debt_payment"
    | "low_balance"
    | "large_expense"
    | "goal_deadline"
    | "custom"
    | null;
  const includeRead = url.searchParams.get("includeRead") !== "false";
  const includeDismissed = url.searchParams.get("includeDismissed") === "true";
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");

  const { notifications, total } = await getNotifications(db, user.id, {
    limit,
    offset,
    includeRead,
    includeDismissed,
    type: type || undefined,
    category: category || undefined,
  });

  return json({ notifications, total });
}

/**
 * POST /api/notifications - Mark read, dismiss, delete, or update preferences
 */
export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();
  const action = formData.get("action") as string;

  // Mark notification as read
  if (action === "mark-read") {
    const notificationId = formData.get("notificationId") as string;
    if (!notificationId) {
      return json({ error: "notificationId required" }, { status: 400 });
    }

    await markNotificationAsRead(db, notificationId);
    return json({ success: true });
  }

  // Mark all notifications as read
  if (action === "mark-all-read") {
    const count = await markAllNotificationsAsRead(db, user.id);
    return json({ success: true, count });
  }

  // Dismiss notification
  if (action === "dismiss") {
    const notificationId = formData.get("notificationId") as string;
    if (!notificationId) {
      return json({ error: "notificationId required" }, { status: 400 });
    }

    await dismissNotification(db, notificationId);
    return json({ success: true });
  }

  // Delete notification
  if (action === "delete") {
    const notificationId = formData.get("notificationId") as string;
    if (!notificationId) {
      return json({ error: "notificationId required" }, { status: 400 });
    }

    const deleted = await deleteNotification(db, notificationId, user.id);
    if (!deleted) {
      return json({ error: "Notification not found" }, { status: 404 });
    }

    return json({ success: true });
  }

  // Cleanup old notifications
  if (action === "cleanup") {
    const olderThanDays = parseInt(formData.get("olderThanDays") || "30");
    const count = await cleanupOldNotifications(db, user.id, olderThanDays);
    return json({ success: true, count });
  }

  // Update notification preferences
  if (action === "update-preferences") {
    const emailEnabled = formData.get("emailEnabled") === "true";
    const pushEnabled = formData.get("pushEnabled") === "true";
    const inAppEnabled = formData.get("inAppEnabled") === "true";
    const paymentDueReminderDays = parseInt(formData.get("paymentDueReminderDays") || "3");
    const budgetAlertThreshold = parseFloat(formData.get("budgetAlertThreshold") || "0.8");
    const lowBalanceThreshold = parseFloat(formData.get("lowBalanceThreshold") || "1000");
    const largeExpenseThreshold = parseFloat(formData.get("largeExpenseThreshold") || "5000000");
    const goalMilestoneReminder = formData.get("goalMilestoneReminder") === "true";
    const recurringTransactionReminder = formData.get("recurringTransactionReminder") === "true";
    const debtPaymentReminder = formData.get("debtPaymentReminder") === "true";

    const preferences = await updateNotificationPreferences(db, user.id, {
      emailEnabled,
      pushEnabled,
      inAppEnabled,
      paymentDueReminderDays,
      budgetAlertThreshold,
      lowBalanceThreshold,
      largeExpenseThreshold,
      goalMilestoneReminder,
      recurringTransactionReminder,
      debtPaymentReminder,
    });

    return json({ success: true, preferences });
  }

  return json({ error: "Invalid action" }, { status: 400 });
}
