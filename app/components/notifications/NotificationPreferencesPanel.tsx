/**
 * Notification Preferences Panel Component
 *
 * Allows users to configure their notification settings
 */

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Input } from "~/components/ui/input";
import type { NotificationPreference } from "~/lib/services/notifications.server";

interface NotificationPreferencesPanelProps {
  preferences: NotificationPreference;
  onUpdate: (updates: Partial<NotificationPreference>) => void;
}

export function NotificationPreferencesPanel({
  preferences,
  onUpdate,
}: NotificationPreferencesPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <h3 className="font-medium">Notification Channels</h3>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="in-app">In-App Notifications</Label>
              <p className="text-sm text-gray-600">Show notifications in the app</p>
            </div>
            <Switch
              id="in-app"
              checked={preferences.inAppEnabled}
              onCheckedChange={(checked) => onUpdate({ inAppEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email">Email Notifications</Label>
              <p className="text-sm text-gray-600">Receive notifications via email</p>
            </div>
            <Switch
              id="email"
              checked={preferences.emailEnabled}
              onCheckedChange={(checked) => onUpdate({ emailEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="push">Push Notifications</Label>
              <p className="text-sm text-gray-600">Receive push notifications</p>
            </div>
            <Switch
              id="push"
              checked={preferences.pushEnabled}
              onCheckedChange={(checked) => onUpdate({ pushEnabled: checked })}
            />
          </div>
        </div>

        {/* Reminder Settings */}
        <div className="space-y-4">
          <h3 className="font-medium">Reminder Settings</h3>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="payment-reminder">Payment Due Reminders</Label>
              <p className="text-sm text-gray-600">
                Remind me before payments are due
              </p>
            </div>
            <Switch
              id="payment-reminder"
              checked={preferences.paymentDueReminderDays > 0}
              onCheckedChange={(checked) =>
                onUpdate({ paymentDueReminderDays: checked ? 3 : 0 })
              }
            />
          </div>

          {preferences.paymentDueReminderDays > 0 && (
            <div className="ml-4">
              <Label htmlFor="payment-days">Days Before Due Date</Label>
              <Input
                id="payment-days"
                type="number"
                min={1}
                max={30}
                value={preferences.paymentDueReminderDays}
                onChange={(e) =>
                  onUpdate({
                    paymentDueReminderDays: parseInt(e.target.value) || 3,
                  })
                }
                className="w-24"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="recurring-reminder">Recurring Transaction Reminders</Label>
              <p className="text-sm text-gray-600">
                Remind me about recurring transactions
              </p>
            </div>
            <Switch
              id="recurring-reminder"
              checked={preferences.recurringTransactionReminder}
              onCheckedChange={(checked) =>
                onUpdate({ recurringTransactionReminder: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="debt-reminder">Debt Payment Reminders</Label>
              <p className="text-sm text-gray-600">
                Remind me about debt payments
              </p>
            </div>
            <Switch
              id="debt-reminder"
              checked={preferences.debtPaymentReminder}
              onCheckedChange={(checked) =>
                onUpdate({ debtPaymentReminder: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="goal-reminder">Goal Milestone Reminders</Label>
              <p className="text-sm text-gray-600">
                Notify me when I reach goal milestones
              </p>
            </div>
            <Switch
              id="goal-reminder"
              checked={preferences.goalMilestoneReminder}
              onCheckedChange={(checked) =>
                onUpdate({ goalMilestoneReminder: checked })
              }
            />
          </div>
        </div>

        {/* Alert Thresholds */}
        <div className="space-y-4">
          <h3 className="font-medium">Alert Thresholds</h3>

          <div className="space-y-2">
            <Label htmlFor="budget-threshold">Budget Alert Threshold (%)</Label>
            <Input
              id="budget-threshold"
              type="number"
              min={50}
              max={100}
              step={5}
              value={Math.round(preferences.budgetAlertThreshold * 100)}
              onChange={(e) =>
                onUpdate({
                  budgetAlertThreshold: (parseInt(e.target.value) || 80) / 100,
                })
              }
              className="w-24"
            />
            <p className="text-xs text-gray-600">
              Alert when spending reaches this % of budget
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="low-balance-threshold">Low Balance Threshold (VND)</Label>
            <Input
              id="low-balance-threshold"
              type="number"
              min={0}
              step={100000}
              value={preferences.lowBalanceThreshold}
              onChange={(e) =>
                onUpdate({
                  lowBalanceThreshold: parseInt(e.target.value) || 1000,
                })
              }
              className="w-48"
            />
            <p className="text-xs text-gray-600">
              Alert when account balance falls below this amount
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="large-expense-threshold">Large Expense Threshold (VND)</Label>
            <Input
              id="large-expense-threshold"
              type="number"
              min={0}
              step={500000}
              value={preferences.largeExpenseThreshold}
              onChange={(e) =>
                onUpdate({
                  largeExpenseThreshold: parseInt(e.target.value) || 5000000,
                })
              }
              className="w-48"
            />
            <p className="text-xs text-gray-600">
              Alert for expenses above this amount
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
