/**
 * Security Events Card Component
 *
 * Display security-related events for monitoring
 */

import type { SecurityEvent } from "~/lib/services/session-management.server";
import { ShieldAlert, ShieldCheck } from "lucide-react";

interface SecurityEventsCardProps {
  events: SecurityEvent[];
}

export function SecurityEventsCard({ events }: SecurityEventsCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getEventLabel = (type: SecurityEvent["eventType"]): string => {
    switch (type) {
      case "password_change":
        return "Password changed";
      case "email_change":
        return "Email changed";
      case "2fa_enabled":
        return "Two-factor authentication enabled";
      case "2fa_disabled":
        return "Two-factor authentication disabled";
      case "2fa_verified":
        return "Two-factor authentication verified";
      case "session_revoked":
        return "Session revoked";
      case "all_sessions_revoked":
        return "All sessions revoked";
      case "suspicious_activity":
        return "Suspicious activity detected";
      case "login_attempt_failed":
        return "Failed login attempt";
      case "backup_code_used":
        return "Backup code used";
      default:
        return type;
    }
  };

  const getEventColor = (type: SecurityEvent["eventType"]): string => {
    const warningEvents = ["2fa_disabled", "session_revoked", "all_sessions_revoked", "suspicious_activity", "login_attempt_failed"];
    if (warningEvents.includes(type)) {
      return "text-amber-500";
    }
    return "text-blue-500";
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <ShieldAlert className="w-6 h-6 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Security Events
        </h3>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No security events recorded.
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                <ShieldCheck className={`w-5 h-5 ${getEventColor(event.eventType)}`} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {getEventLabel(event.eventType)}
                </p>

                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-500">
                  <span>{formatDate(event.createdAt)}</span>
                  {event.ipAddress && <span>• {event.ipAddress}</span>}
                </div>

                {event.metadata && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                      View details
                    </summary>
                    <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                      {JSON.stringify(JSON.parse(event.metadata), null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
