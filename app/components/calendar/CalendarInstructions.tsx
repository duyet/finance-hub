/**
 * Calendar Instructions Component
 *
 * Shows how to subscribe to the iCalendar feed in popular calendar apps
 */

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { BookOpen } from "lucide-react";

interface CalendarInstructionsProps {
  subscriptionUrl: string;
}

export function CalendarInstructions({ subscriptionUrl }: CalendarInstructionsProps) {
  const host = new URL(subscriptionUrl).hostname;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          How to Subscribe
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google Calendar */}
        <div>
          <h3 className="font-semibold mb-2">Google Calendar</h3>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>Open Google Calendar on your computer</li>
            <li>Go to Settings → Settings → Add calendar</li>
            <li>Select "From URL" and enter the iCalendar URL above</li>
            <li>Click "Add calendar"</li>
          </ol>
        </div>

        {/* Apple Calendar */}
        <div>
          <h3 className="font-semibold mb-2">Apple Calendar (macOS/iOS)</h3>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>File → New Calendar Subscription (macOS) or Settings → Accounts → Add Account → Other → CalDAV (iOS)</li>
            <li>Paste the iCalendar URL above</li>
            <li>Adjust refresh settings (recommended: daily)</li>
            <li>Click OK or Subscribe</li>
          </ol>
        </div>

        {/* Outlook */}
        <div>
          <h3 className="font-semibold mb-2">Microsoft Outlook</h3>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
            <li>Open Calendar and click "Add Calendar" → "Subscribe from web"</li>
            <li>Paste the iCalendar URL above</li>
            <li>Enter a calendar name</li>
            <li>Click "Import"</li>
          </ol>
        </div>

        {/* Other Calendars */}
        <div>
          <h3 className="font-semibold mb-2">Other Calendar Apps</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Any calendar app that supports the iCalendar format (RFC 5545) can subscribe to this feed.
            Look for options like "Subscribe", "Add Calendar from URL", or "Import from URL".
          </p>
        </div>

        {/* Tips */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Tips</p>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Set your calendar to auto-refresh daily for updates</li>
            <li>• Events appear {subscriptionUrl.includes("days_ahead") ? "based on your settings" : "7 days ahead"} by default</li>
            <li>• Changes to your financial reminders will sync automatically</li>
            <li>• Keep the iCalendar URL private - it's unique to your account</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
