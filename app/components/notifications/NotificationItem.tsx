/**
 * Notification Item Component
 *
 * Displays a single notification with read/dismiss actions
 */

import { Link } from "react-router";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  AlertCircle,
  X,
  Check,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import type { Notification } from "~/lib/services/notifications.server";

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

const NOTIFICATION_CONFIG = {
  reminder: {
    icon: Bell,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
  },
  alert: {
    icon: AlertTriangle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
  },
  info: {
    icon: Info,
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    iconColor: "text-gray-600",
  },
  success: {
    icon: CheckCircle,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconColor: "text-green-600",
  },
  warning: {
    icon: AlertCircle,
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    iconColor: "text-orange-600",
  },
};

export function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
}: NotificationItemProps) {
  const config = NOTIFICATION_CONFIG[notification.type];
  const Icon = config.icon;

  const content = (
    <div
      className={`p-4 border rounded-lg transition-all ${
        notification.isRead ? "bg-white opacity-70" : config.bgColor
      } ${notification.isRead ? "border-gray-200" : config.borderColor}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`mt-0.5 ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4
              className={`font-medium text-sm ${
                notification.isRead ? "text-gray-600" : "text-gray-900"
              }`}
            >
              {notification.title}
            </h4>
            {notification.actionRequired && (
              <span className="px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                Action Required
              </span>
            )}
          </div>
          <p
            className={`text-sm mb-2 ${
              notification.isRead ? "text-gray-500" : "text-gray-700"
            }`}
          >
            {notification.message}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>
              {formatDistanceToNow(new Date(notification.createdAt), {
                addSuffix: true,
              })}
            </span>
            {notification.dueDate && (
              <span>
                Due: {new Date(notification.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {!notification.isRead && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMarkRead(notification.id)}
              aria-label="Mark as read"
            >
              <Check className="w-4 h-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onDismiss(notification.id)}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  if (notification.linkUrl) {
    return (
      <Link
        to={notification.linkUrl}
        onClick={() => {
          if (!notification.isRead) {
            onMarkRead(notification.id);
          }
        }}
      >
        {content}
      </Link>
    );
  }

  return content;
}
