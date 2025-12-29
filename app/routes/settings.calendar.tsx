/**
 * Calendar Settings Page
 *
 * Manage calendar subscriptions for syncing financial reminders
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useNavigation, Form } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import {
  getCalendarSubscriptions,
  createCalendarSubscription,
  updateCalendarSubscription,
  deleteCalendarSubscription,
  regenerateSubscriptionToken,
  type CreateSubscriptionInput,
} from "~/lib/services/calendar.server";
import { redirect } from "react-router";
import { Sidebar } from "~/components/layout/Sidebar";
import { CalendarSubscriptionCard, CalendarInstructions } from "~/components/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Calendar as CalendarIcon, Plus, Check } from "lucide-react";
import { useState } from "react";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  const subscriptions = await getCalendarSubscriptions(db, user.id);

  // Generate subscription URLs
  const baseUrl = new URL(request.url).origin;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    subscriptions: subscriptions.map((sub) => ({
      ...sub,
      subscriptionUrl: `${baseUrl}/api/calendar/${sub.secretToken}/feed.ics`,
    })),
    baseUrl,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const input: CreateSubscriptionInput = {
      userId: user.id,
      name: formData.get("name") as string,
      includeBillReminders: formData.get("includeBillReminders") === "on",
      includeGoalReminders: formData.get("includeGoalReminders") === "on",
      includeRecurringTransactions: formData.get("includeRecurringTransactions") === "on",
      includeDebtPayments: formData.get("includeDebtPayments") === "on",
      includeCustomReminders: formData.get("includeCustomReminders") === "on",
      daysAhead: parseInt(formData.get("daysAhead") as string) || 7,
    };

    await createCalendarSubscription(db, input);
    return redirect("/settings/calendar");
  }

  if (intent === "delete") {
    const subscriptionId = formData.get("subscriptionId") as string;
    await deleteCalendarSubscription(db, subscriptionId, user.id);
    return redirect("/settings/calendar");
  }

  if (intent === "regenerate") {
    const subscriptionId = formData.get("subscriptionId") as string;
    await regenerateSubscriptionToken(db, subscriptionId, user.id);
    return redirect("/settings/calendar");
  }

  if (intent === "toggle") {
    const subscriptionId = formData.get("subscriptionId") as string;
    const isActive = formData.get("isActive") === "true";
    await updateCalendarSubscription(db, subscriptionId, user.id, { isActive: !isActive });
    return redirect("/settings/calendar");
  }

  return null;
}

export default function CalendarSettingsPage() {
  const { user, subscriptions, baseUrl } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [showNewForm, setShowNewForm] = useState(false);
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 pt-4 lg:pt-0">
            <h1 className="text-3xl font-bold text-gray-900">Calendar Sync</h1>
            <p className="mt-2 text-gray-600">
              Subscribe to your financial reminders in Google Calendar, Apple Calendar, Outlook, and more
            </p>
          </div>

          {/* Subscriptions List */}
          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No Calendar Subscriptions</h2>
                <p className="text-gray-600 mb-6">
                  Create your first calendar subscription to sync your financial reminders
                </p>
                <Button onClick={() => setShowNewForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Subscription
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4 mb-8">
                {subscriptions.map((sub) => (
                  <CalendarSubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    subscriptionUrl={sub.subscriptionUrl}
                    onToggle={(id) => {
                      const form = document.createElement("form");
                      form.method = "post";
                      form.appendChild(document.createElement("input")).name = "intent";
                      (form.children[0] as HTMLInputElement).value = "toggle";
                      const subId = document.createElement("input");
                      subId.type = "hidden";
                      subId.name = "subscriptionId";
                      subId.value = id;
                      const isActive = document.createElement("input");
                      isActive.type = "hidden";
                      isActive.name = "isActive";
                      isActive.value = String(sub.isActive);
                      form.appendChild(subId);
                      form.appendChild(isActive);
                      document.body.appendChild(form);
                      form.submit();
                    }}
                    onRegenerate={(id) => {
                      const form = document.createElement("form");
                      form.method = "post";
                      const intentInput = document.createElement("input");
                      intentInput.type = "hidden";
                      intentInput.name = "intent";
                      intentInput.value = "regenerate";
                      const subId = document.createElement("input");
                      subId.type = "hidden";
                      subId.name = "subscriptionId";
                      subId.value = id;
                      form.appendChild(intentInput);
                      form.appendChild(subId);
                      document.body.appendChild(form);
                      form.submit();
                    }}
                    onDelete={(id) => {
                      const form = document.createElement("form");
                      form.method = "post";
                      const intentInput = document.createElement("input");
                      intentInput.type = "hidden";
                      intentInput.name = "intent";
                      intentInput.value = "delete";
                      const subId = document.createElement("input");
                      subId.type = "hidden";
                      subId.name = "subscriptionId";
                      subId.value = id;
                      form.appendChild(intentInput);
                      form.appendChild(subId);
                      document.body.appendChild(form);
                      form.submit();
                    }}
                  />
                ))}
              </div>

              <div className="flex justify-center mb-8">
                <Button onClick={() => setShowNewForm(!showNewForm)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  {showNewForm ? "Cancel" : "Add Another Subscription"}
                </Button>
              </div>
            </>
          )}

          {/* New Subscription Form */}
          {showNewForm && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Create New Subscription</CardTitle>
              </CardHeader>
              <CardContent>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="create" />

                  <div>
                    <Label htmlFor="name">Subscription Name</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="My Financial Calendar"
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="daysAhead">Days Ahead to Show Events</Label>
                    <Input
                      id="daysAhead"
                      name="daysAhead"
                      type="number"
                      min="1"
                      max="365"
                      defaultValue="7"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Events will appear this many days before their due date
                    </p>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Include in Calendar</Label>
                    <div className="mt-2 space-y-2">
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="includeBillReminders" defaultChecked className="rounded" />
                        <span className="text-sm">Bill Reminders</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="includeGoalReminders" defaultChecked className="rounded" />
                        <span className="text-sm">Goal Reminders</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="includeRecurringTransactions" defaultChecked className="rounded" />
                        <span className="text-sm">Recurring Transactions</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="includeDebtPayments" defaultChecked className="rounded" />
                        <span className="text-sm">Debt Payments</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" name="includeCustomReminders" defaultChecked className="rounded" />
                        <span className="text-sm">Custom Reminders</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Creating..." : "Create Subscription"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowNewForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {subscriptions.length > 0 && (
            <CalendarInstructions subscriptionUrl={subscriptions[0].subscriptionUrl} />
          )}

          {/* Tips */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-3">Calendar Sync Tips</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>• <strong>Auto-refresh</strong>: Most calendars update subscription feeds daily</li>
              <li>• <strong>Event Colors</strong>: You can set colors for imported events in your calendar</li>
              <li>• <strong>Privacy</strong>: Your iCalendar URL is unique and private - don't share it publicly</li>
              <li>• <strong>Reminders</strong>: Set additional reminders in your calendar app for important events</li>
              <li>• <strong>Multiple Calendars</strong>: Create separate subscriptions for different event types</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
