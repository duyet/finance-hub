/**
 * Two-Factor Backup Codes Card Component
 *
 * Display and regenerate backup codes for 2FA
 */

import { useState } from "react";
import { Copy, Check, Key, RotateCcw } from "lucide-react";

interface TwoFactorBackupCodesCardProps {
  backupCodes: string[];
  onRegenerate: () => Promise<string[]>;
}

export function TwoFactorBackupCodesCard({ backupCodes, onRegenerate }: TwoFactorBackupCodesCardProps) {
  const [copiedCodes, setCopiedCodes] = useState<number[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const copyBackupCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodes([...copiedCodes, index]);
    setTimeout(() => setCopiedCodes(copiedCodes.filter((i) => i !== index)), 2000);
  };

  const copyAllBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedCodes(backupCodes.map((_, i) => i));
    setTimeout(() => setCopiedCodes([]), 2000);
  };

  const handleRegenerate = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setRegenerating(true);
    await onRegenerate();
    setRegenerating(false);
    setShowConfirm(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Key className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Backup Codes
          </h3>
        </div>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          {regenerating ? "Regenerating..." : "Regenerate"}
        </button>
      </div>

      {backupCodes.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No backup codes available. Generate new codes to ensure you can access your account
          if you lose your authenticator device.
        </p>
      ) : (
        <>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            You have {backupCodes.length} backup code{backupCodes.length !== 1 ? "s" : ""}{" "}
            remaining. Use these codes if you lose access to your authenticator app.
          </p>

          {showConfirm && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                <strong>Warning:</strong> This will invalidate your existing backup codes and
                generate new ones. Make sure you've saved your current codes before proceeding.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirm(false);
                    setRegenerating(true);
                    onRegenerate().then(() => setRegenerating(false));
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm"
                >
                  Yes, Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="px-3 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end mb-2">
            <button
              type="button"
              onClick={copyAllBackupCodes}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Copy All Codes
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <Key className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <code className="flex-1 text-sm font-mono tracking-wider">{code}</code>
                <button
                  type="button"
                  onClick={() => copyBackupCode(code, index)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex-shrink-0"
                  title="Copy code"
                >
                  {copiedCodes.includes(index) ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Tip:</strong> Store these codes in a secure location like a password
              manager. Each code can only be used once.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
