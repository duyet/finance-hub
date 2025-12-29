/**
 * Two-Factor Setup Card Component
 *
 * Guides user through 2FA setup with QR code and backup codes
 */

import { useState } from "react";
import { Copy, Check, QrCode, Key } from "lucide-react";

interface TwoFactorSetupCardProps {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  onVerify: (code: string) => Promise<boolean>;
  onComplete: () => void;
}

export function TwoFactorSetupCard({
  secret,
  qrCodeUrl,
  backupCodes,
  onVerify,
  onComplete,
}: TwoFactorSetupCardProps) {
  const [code, setCode] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }

    setVerifying(true);
    setError("");

    const success = await onVerify(code);
    if (success) {
      onComplete();
    } else {
      setError("Invalid code. Please try again.");
      setVerifying(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

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

  // Generate QR code using a QR code API
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Set Up Two-Factor Authentication
      </h3>

      <div className="space-y-6">
        {/* Step 1: Scan QR Code */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Step 1: Scan QR Code
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Use your authenticator app (Google Authenticator, Authy, 1Password, etc.) to scan
            this QR code:
          </p>

          <div className="flex justify-center mb-3">
            <div className="p-4 bg-white rounded-lg border border-gray-200 dark:border-gray-700">
              <img src={qrCodeImageUrl} alt="QR Code" className="w-48 h-48" />
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Or enter this code manually:
          </p>
          <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <code className="flex-1 text-sm font-mono break-all">{secret}</code>
            <button
              type="button"
              onClick={copySecret}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Copy secret"
            >
              {copiedSecret ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Step 2: Enter Verification Code */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Step 2: Enter Verification Code
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Enter the 6-digit code from your authenticator app:
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError("");
              }}
              placeholder="000000"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-center tracking-widest text-xl font-mono"
              maxLength={6}
            />
            <button
              type="button"
              onClick={handleVerify}
              disabled={code.length !== 6 || verifying}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {verifying ? "Verifying..." : "Verify"}
            </button>
          </div>

          {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        </div>

        {/* Step 3: Save Backup Codes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Step 3: Save Backup Codes
            </h4>
            <button
              type="button"
              onClick={copyAllBackupCodes}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Copy All
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Save these backup codes in a safe place. You can use them to access your account if
            you lose your authenticator device.
          </p>

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
        </div>

        {/* Warning */}
        <div className="p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Important:</strong> Keep your backup codes secure and private. Each code can
            only be used once. Store them in a password manager or write them down and keep them
            in a safe place.
          </p>
        </div>
      </div>
    </div>
  );
}
