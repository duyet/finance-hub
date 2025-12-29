/**
 * Notification Stats Card Component
 *
 * Displays notification statistics
 */

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Bell, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import type { NotificationStats } from "~/lib/services/notifications.server";

interface NotificationStatsCardProps {
  stats: NotificationStats;
}

export function NotificationStatsCard({ stats }: NotificationStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notification Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Unread</p>
            <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Action Required</p>
            <p
              className={`text-2xl font-bold ${
                stats.unreadActionRequired > 0 ? "text-orange-600" : "text-gray-900"
              }`}
            >
              {stats.unreadActionRequired}
            </p>
          </div>
        </div>

        {stats.unreadActionRequired > 0 && (
          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <p className="text-sm text-orange-800">
                You have {stats.unreadActionRequired} notification{stats.unreadActionRequired > 1 ? "s" : ""} requiring
                action.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
