/**
 * Notification Bell Component
 *
 * Displays a bell icon with notification badge in the header
 */

import { Link } from "react-router";
import { Bell } from "lucide-react";
import type { NotificationStats } from "~/lib/services/notifications.server";

interface NotificationBellProps {
  stats: NotificationStats;
}

export function NotificationBell({ stats }: NotificationBellProps) {
  const unreadCount = stats.unread;
  const hasActionRequired = stats.unreadActionRequired > 0;

  return (
    <Link
      to="/notifications"
      className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
    >
      <Bell className={`w-6 h-6 ${hasActionRequired ? "text-orange-600" : "text-gray-600"}`} />

      {unreadCount > 0 && (
        <span
          className={`absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white rounded-full ${
            hasActionRequired ? "bg-orange-500" : "bg-blue-500"
          }`}
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
