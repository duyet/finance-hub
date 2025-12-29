/**
 * Active Sessions Card Component
 *
 * Display and manage active user sessions
 */

import type { UserSession } from "~/lib/services/session-management.server";
import { Monitor, Smartphone, Tablet, X } from "lucide-react";

interface ActiveSessionsCardProps {
  sessions: UserSession[];
  currentSessionId: string;
  onRevoke: (sessionId: string) => void;
  onRevokeAll: () => void;
}

export function ActiveSessionsCard({
  sessions,
  currentSessionId,
  onRevoke,
  onRevokeAll,
}: ActiveSessionsCardProps) {
  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType) {
      case "mobile":
        return Smartphone;
      case "tablet":
        return Tablet;
      default:
        return Monitor;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Active Sessions
        </h3>
        {sessions.length > 1 && (
          <button
            type="button"
            onClick={onRevokeAll}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Revoke All Others
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No active sessions found.
        </p>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const Icon = getDeviceIcon(session.deviceType);
            const isCurrent = session.id === currentSessionId;

            return (
              <div
                key={session.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  isCurrent
                    ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                    : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                }`}
              >
                <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {session.browser || "Unknown Browser"}
                      {isCurrent && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                          Current
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {session.os || "Unknown OS"} • {session.deviceType || "Unknown Device"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Last active: {formatDate(session.lastActiveAt)}
                    {session.ipAddress && ` • ${session.ipAddress}`}
                  </p>
                </div>

                {!isCurrent && (
                  <button
                    type="button"
                    onClick={() => onRevoke(session.id)}
                    className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                    title="Revoke session"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
