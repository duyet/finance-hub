/**
 * Two-Factor Verification Dialog Component
 *
 * Modal dialog for 2FA code verification during login
 */

import { useState } from "react";
import { Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";

interface TwoFactorVerifyDialogProps {
  open: boolean;
  onClose: () => void;
  onVerify: (code: string) => Promise<boolean>;
  error?: string;
}

export function TwoFactorVerifyDialog({
  open,
  onClose,
  onVerify,
  error: externalError,
}: TwoFactorVerifyDialogProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setVerifying(true);
    setError("");

    const success = await onVerify(code);
    if (success) {
      onClose();
      setCode("");
    } else {
      setError(externalError || "Invalid code. Please try again.");
      setVerifying(false);
    }
  };

  const handleBackupCode = () => {
    // This would typically open a different flow for backup code entry
    alert("Backup code entry would be handled here");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            Two-Factor Authentication
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter the 6-digit verification code from your authenticator app:
          </p>

          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
              setError("");
            }}
            placeholder="000000"
            className="w-full px-3 py-2 text-center text-2xl tracking-widest font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={6}
            autoFocus
          />

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={code.length !== 6 || verifying}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {verifying ? "Verifying..." : "Verify"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>

          <button
            type="button"
            onClick={handleBackupCode}
            className="w-full text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Use a backup code instead
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
