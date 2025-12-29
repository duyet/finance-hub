/**
 * Calendar Subscription Card Component
 *
 * Displays a calendar subscription with its iCalendar URL and settings
 */

import type { CalendarSubscription } from "~/lib/services/calendar.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Calendar, Copy, Trash2, RefreshCw } from "lucide-react";
import { useState } from "react";

interface CalendarSubscriptionCardProps {
  subscription: CalendarSubscription;
  subscriptionUrl: string;
  onToggle?: (subscriptionId: string, isActive: boolean) => void;
  onRegenerate?: (subscriptionId: string) => void;
  onDelete?: (subscriptionId: string) => void;
}

export function CalendarSubscriptionCard({
  subscription,
  subscriptionUrl,
  onToggle,
  onRegenerate,
  onDelete,
}: CalendarSubscriptionCardProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(subscriptionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatUrl = (url: string) => {
    // Truncate URL for display
    if (url.length > 50) {
      return url.substring(0, 47) + "...";
    }
    return url;
  };

  return (
    <Card className={subscription.isActive ? "" : "opacity-60"}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {subscription.name}
          </span>
          <div className="flex items-center gap-2">
            <Switch
              checked={subscription.isActive}
              onCheckedChange={(checked) => onToggle?.(subscription.id, checked)}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subscription URL */}
        <div>
          <Label>iCalendar URL</Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 text-xs bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded overflow-hidden">
              {formatUrl(subscriptionUrl)}
            </code>
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              {copied ? (
                <span className="text-green-600">Copied!</span>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Use this URL to subscribe in Google Calendar, Outlook, Apple Calendar, or any other calendar app
          </p>
        </div>

        {/* Statistics */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>Accessed: {subscription.accessCount} times</span>
          {subscription.lastAccessedAt && (
            <span>Last: {new Date(subscription.lastAccessedAt).toLocaleDateString()}</span>
          )}
        </div>

        {/* Included Events */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <p className="text-sm font-medium mb-2">Included Events</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {subscription.includeBillReminders && (
              <span className="text-gray-600 dark:text-gray-400">✓ Bill Reminders</span>
            )}
            {subscription.includeGoalReminders && (
              <span className="text-gray-600 dark:text-gray-400">✓ Goal Reminders</span>
            )}
            {subscription.includeRecurringTransactions && (
              <span className="text-gray-600 dark:text-gray-400">✓ Recurring Transactions</span>
            )}
            {subscription.includeDebtPayments && (
              <span className="text-gray-600 dark:text-gray-400">✓ Debt Payments</span>
            )}
            {subscription.includeCustomReminders && (
              <span className="text-gray-600 dark:text-gray-400">✓ Custom Reminders</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Events shown {subscription.daysAhead} days ahead
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-gray-200 dark:border-gray-700 pt-4">
          <Button variant="outline" size="sm" onClick={() => onRegenerate?.(subscription.id)}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Regenerate URL
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete?.(subscription.id)}>
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
