/**
 * Notifications Page
 *
 * Displays and manages user notifications
 */

import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigation, useFetcher } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import {
  getNotifications,
  getNotificationStats,
  getNotificationPreferences,
} from "~/lib/services/notifications.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { NotificationList } from "~/components/notifications";
import { NotificationStatsCard } from "~/components/notifications";
import { NotificationPreferencesPanel } from "~/components/notifications";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Get notifications, stats, and preferences
  const [notificationsResult, stats, preferences] = await Promise.all([
    getNotifications(db, user.id, {
      limit: 100,
      includeRead: true,
      includeDismissed: false,
    }),
    getNotificationStats(db, user.id),
    getNotificationPreferences(db, user.id),
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    notifications: notificationsResult.notifications,
    stats,
    preferences,
  };
}

export default function NotificationsIndexPage() {
  const { user, notifications, stats, preferences } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [showPreferences, setShowPreferences] = useState(false);

  const isSubmitting = navigation.state === "submitting";

  // Mark notification as read
  const handleMarkRead = async (notificationId: string) => {
    const formData = new FormData();
    formData.append("action", "mark-read");
    formData.append("notificationId", notificationId);

    await fetch("/api/notifications", {
      method: "POST",
      body: formData,
    });

    // Reload page to show updated state
    window.location.reload();
  };

  // Dismiss notification
  const handleDismiss = async (notificationId: string) => {
    const formData = new FormData();
    formData.append("action", "dismiss");
    formData.append("notificationId", notificationId);

    await fetch("/api/notifications", {
      method: "POST",
      body: formData,
    });

    // Reload page to show updated state
    window.location.reload();
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    const formData = new FormData();
    formData.append("action", "mark-all-read");

    await fetch("/api/notifications", {
      method: "POST",
      body: formData,
    });

    // Reload page to show updated state
    window.location.reload();
  };

  // Update preferences
  const handleUpdatePreferences = async (updates: Partial<typeof preferences>) => {
    const formData = new FormData();
    formData.append("action", "update-preferences");
    if (updates.emailEnabled !== undefined) {
      formData.append("emailEnabled", updates.emailEnabled.toString());
    }
    if (updates.pushEnabled !== undefined) {
      formData.append("pushEnabled", updates.pushEnabled.toString());
    }
    if (updates.inAppEnabled !== undefined) {
      formData.append("inAppEnabled", updates.inAppEnabled.toString());
    }
    if (updates.paymentDueReminderDays !== undefined) {
      formData.append("paymentDueReminderDays", updates.paymentDueReminderDays.toString());
    }
    if (updates.budgetAlertThreshold !== undefined) {
      formData.append("budgetAlertThreshold", updates.budgetAlertThreshold.toString());
    }
    if (updates.lowBalanceThreshold !== undefined) {
      formData.append("lowBalanceThreshold", updates.lowBalanceThreshold.toString());
    }
    if (updates.largeExpenseThreshold !== undefined) {
      formData.append("largeExpenseThreshold", updates.largeExpenseThreshold.toString());
    }
    if (updates.goalMilestoneReminder !== undefined) {
      formData.append("goalMilestoneReminder", updates.goalMilestoneReminder.toString());
    }
    if (updates.recurringTransactionReminder !== undefined) {
      formData.append("recurringTransactionReminder", updates.recurringTransactionReminder.toString());
    }
    if (updates.debtPaymentReminder !== undefined) {
      formData.append("debtPaymentReminder", updates.debtPaymentReminder.toString());
    }

    await fetch("/api/notifications", {
      method: "POST",
      body: formData,
    });

    // Reload page to show updated state
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 pt-4 lg:pt-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                <p className="mt-2 text-gray-600">
                  Stay updated on your financial activities
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPreferences(!showPreferences)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {showPreferences ? "View Notifications" : "Preferences"}
              </button>
            </div>
          </div>

          {showPreferences ? (
            /* Preferences View */
            <div className="max-w-2xl">
              <NotificationPreferencesPanel
                preferences={preferences}
                onUpdate={handleUpdatePreferences}
              />
            </div>
          ) : (
            /* Notifications View */
            <div className="space-y-6">
              {/* Stats Card */}
              <NotificationStatsCard stats={stats} />

              {/* Notifications List */}
              <NotificationList
                notifications={notifications}
                onMarkRead={handleMarkRead}
                onDismiss={handleDismiss}
                onMarkAllRead={handleMarkAllRead}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
