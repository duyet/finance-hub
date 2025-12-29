/**
 * Login History Card Component
 *
 * Display recent login history with success/failure status
 */

import type { LoginHistory } from "~/lib/services/session-management.server";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface LoginHistoryCardProps {
  history: LoginHistory[];
}

export function LoginHistoryCard({ history }: LoginHistoryCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const getLoginTypeLabel = (type: LoginHistory["loginType"]) => {
    switch (type) {
      case "password":
        return "Password";
      case "2fa":
        return "2FA Code";
      case "backup_code":
        return "Backup Code";
      case "social":
        return "Social Login";
      case "sso":
        return "SSO";
      default:
        return type;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <Clock className="w-6 h-6 text-gray-500" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Login History
        </h3>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No login history available.
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                {entry.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {entry.success ? "Successful login" : "Failed login attempt"}
                  </p>
                  <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                    {getLoginTypeLabel(entry.loginType)}
                  </span>
                  {entry.twoFactorUsed && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                      2FA
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {entry.browser} on {entry.os} • {entry.deviceType}
                </p>

                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-500">
                  <span>{formatDate(entry.createdAt)}</span>
                  {entry.ipAddress && <span>• {entry.ipAddress}</span>}
                  {entry.location && <span>• {entry.location}</span>}
                </div>

                {!entry.success && entry.failureReason && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    {entry.failureReason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
