/**
 * Two-Factor Status Card Component
 *
 * Displays current 2FA status with enable/disable actions
 */

import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";

interface TwoFactorStatusCardProps {
  enabled: boolean;
  verified: boolean;
  backupCodesCount: number;
  onEnable: () => void;
  onDisable: () => void;
}

export function TwoFactorStatusCard({
  enabled,
  verified,
  backupCodesCount,
  onEnable,
  onDisable,
}: TwoFactorStatusCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        {enabled && verified ? (
          <ShieldCheck className="w-6 h-6 text-green-500" />
        ) : enabled ? (
          <ShieldAlert className="w-6 h-6 text-amber-500" />
        ) : (
          <Shield className="w-6 h-6 text-gray-400" />
        )}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Two-Factor Authentication Status
        </h3>
      </div>

      <div className="space-y-4">
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {enabled && verified ? (
                <span className="text-green-600 dark:text-green-400">Enabled</span>
              ) : enabled ? (
                <span className="text-amber-600 dark:text-amber-400">Pending Verification</span>
              ) : (
                <span className="text-gray-600 dark:text-gray-400">Disabled</span>
              )}
            </p>
          </div>
          {enabled && verified && (
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Backup Codes</p>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {backupCodesCount} remaining
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        {!enabled && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add an extra layer of security to your account by requiring a verification code
            from your authenticator app when signing in.
          </p>
        )}

        {/* Action Buttons */}
        {!enabled ? (
          <button
            type="button"
            onClick={onEnable}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Enable Two-Factor Authentication
          </button>
        ) : (
          <div className="space-y-2">
            {backupCodesCount < 3 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  ⚠️ You have only {backupCodesCount} backup code{backupCodesCount !== 1 ? "s" : ""} remaining.
                  Consider regenerating them.
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={onDisable}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              Disable Two-Factor Authentication
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
