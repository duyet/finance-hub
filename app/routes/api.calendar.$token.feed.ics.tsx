/**
 * iCalendar Feed API Route
 *
 * Serves iCalendar (.ics) file for calendar subscriptions
 */

import type { LoaderFunctionArgs } from "react-router";
import { getDb } from "~/lib/auth/db.server";
import { getCalendarSubscriptionByToken, generateICalCalendar, type ICalEvent } from "~/lib/services/calendar.server";
import { getNotifications } from "~/lib/services/notifications.server";
import { getRecurringTransactions } from "~/lib/services/recurring-transactions.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { token } = params;
  if (!token) {
    throw new Response("Invalid token", { status: 400 });
  }

  const db = getDb(request);
  const subscription = await getCalendarSubscriptionByToken(db, token);

  if (!subscription) {
    throw new Response("Subscription not found", { status: 404 });
  }

  // Collect events based on subscription settings
  const events: ICalEvent[] = [];
  const now = new Date();
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 3); // Show events for next 3 months
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() + subscription.daysAhead);

  // Add bill reminders from notifications
  if (subscription.includeBillReminders) {
    const notifications = await getNotifications(db, subscription.userId, {
      type: "payment_due",
      limit: 100,
    });
    for (const notif of notifications) {
      if (notif.scheduledAt) {
        const eventDate = new Date(notif.scheduledAt);
        if (eventDate >= startDate && eventDate <= endDate) {
          events.push({
            uid: `bill-${notif.id}@financehub`,
            title: notif.title || "Bill Payment Due",
            description: notif.message || "",
            start: eventDate,
            end: new Date(eventDate.getTime() + 60 * 60 * 1000), // 1 hour
            allDay: false,
          });
        }
      }
    }
  }

  // Add goal reminders
  if (subscription.includeGoalReminders) {
    const notifications = await getNotifications(db, subscription.userId, {
      type: "goal_milestone",
      limit: 100,
    });
    for (const notif of notifications) {
      if (notif.scheduledAt) {
        const eventDate = new Date(notif.scheduledAt);
        if (eventDate >= startDate && eventDate <= endDate) {
          events.push({
            uid: `goal-${notif.id}@financehub`,
            title: notif.title || "Goal Milestone",
            description: notif.message || "",
            start: eventDate,
            end: new Date(eventDate.getTime() + 60 * 60 * 1000),
            allDay: false,
          });
        }
      }
    }
  }

  // Add recurring transactions
  if (subscription.includeRecurringTransactions) {
    const recurring = await getRecurringTransactions(db, subscription.userId);
    for (const tx of recurring) {
      if (tx.nextDate) {
        const eventDate = new Date(tx.nextDate);
        if (eventDate >= startDate && eventDate <= endDate) {
          events.push({
            uid: `recurring-${tx.id}@financehub`,
            title: `${tx.category || tx.description} - ${tx.description}`,
            description: `Recurring ${tx.type} transaction`,
            start: eventDate,
            end: eventDate,
            allDay: true,
          });
        }
      }
    }
  }

  // Add debt payment reminders
  if (subscription.includeDebtPayments) {
    const notifications = await getNotifications(db, subscription.userId, {
      type: "debt_payment",
      limit: 100,
    });
    for (const notif of notifications) {
      if (notif.scheduledAt) {
        const eventDate = new Date(notif.scheduledAt);
        if (eventDate >= startDate && eventDate <= endDate) {
          events.push({
            uid: `debt-${notif.id}@financehub`,
            title: notif.title || "Debt Payment Due",
            description: notif.message || "",
            start: eventDate,
            end: new Date(eventDate.getTime() + 60 * 60 * 1000),
            allDay: false,
          });
        }
      }
    }
  }

  // Add custom reminders
  if (subscription.includeCustomReminders) {
    const notifications = await getNotifications(db, subscription.userId, {
      type: "reminder",
      limit: 100,
    });
    for (const notif of notifications) {
      if (notif.scheduledAt) {
        const eventDate = new Date(notif.scheduledAt);
        if (eventDate >= startDate && eventDate <= endDate) {
          events.push({
            uid: `reminder-${notif.id}@financehub`,
            title: notif.title || "Reminder",
            description: notif.message || "",
            start: eventDate,
            end: new Date(eventDate.getTime() + 60 * 60 * 1000),
            allDay: false,
          });
        }
      }
    }
  }

  // Generate iCalendar content
  const icsContent = generateICalCalendar(events, subscription.name);

  // Return as .ics file
  return new Response(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${subscription.name.replace(/[^a-z0-9]/gi, '-')}.ics"`,
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}
