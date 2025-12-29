/**
 * Notification List Component
 *
 * Displays a list of notifications with filters
 */

import { useState } from "react";
import { NotificationItem } from "./NotificationItem";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { Notification, NotificationType } from "~/lib/services/notifications.server";

interface NotificationListProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationList({
  notifications,
  onMarkRead,
  onDismiss,
  onMarkAllRead,
}: NotificationListProps) {
  const [filter, setFilter] = useState<"all" | "unread" | NotificationType>("all");

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return !notification.isDismissed;
    if (filter === "unread") return !notification.isRead && !notification.isDismissed;
    return notification.type === filter && !notification.isDismissed;
  });

  const unreadCount = notifications.filter((n) => !n.isRead && !n.isDismissed).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-600">
                ({unreadCount} unread)
              </span>
            )}
          </h2>

          <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="reminder">Reminders</SelectItem>
              <SelectItem value="alert">Alerts</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="warning">Warnings</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={onMarkAllRead}>
            Mark All Read
          </Button>
        )}
      </div>

      {/* Notifications */}
      {filteredNotifications.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-lg border">
          <div className="text-5xl mb-4">📬</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {filter === "all" ? "No notifications" : "No notifications match this filter"}
          </h3>
          <p className="text-gray-600">
            {filter === "all"
              ? "You're all caught up! Check back later for new notifications."
              : "Try a different filter to see more notifications."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={onMarkRead}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}
