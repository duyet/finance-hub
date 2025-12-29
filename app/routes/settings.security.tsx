/**
 * Security Settings Page
 *
 * Manage security settings including two-factor authentication
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { json, redirect } from "react-router";
import { requireUser } from "~/lib/services/auth.server";
import { getDb } from "~/lib/db";
import {
  generateTwoFactorSecret,
  verifyAndEnableTwoFactor,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateBackupCodes,
  isTwoFactorEnabled,
} from "~/lib/services/two-factor.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { TwoFactorStatusCard } from "~/components/two-factor";
import { TwoFactorSetupCard } from "~/components/two-factor";
import { TwoFactorBackupCodesCard } from "~/components/two-factor";
import { Shield } from "lucide-react";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const db = getDb();

  const status = await getTwoFactorStatus(db, user.id);

  return json({ status });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const db = getDb();
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "setup-2fa") {
    const result = await generateTwoFactorSecret(db, user.id);
    return json({ success: true, setupData: result });
  }

  if (intent === "verify-2fa") {
    const code = formData.get("code") as string;
    const success = await verifyAndEnableTwoFactor(db, user.id, code);
    return json({ success });
  }

  if (intent === "disable-2fa") {
    await disableTwoFactor(db, user.id);
    return json({ success: true });
  }

  if (intent === "regenerate-codes") {
    const newCodes = await regenerateBackupCodes(db, user.id);
    return json({ success: true, backupCodes: newCodes });
  }

  return json({ success: false });
}

export default function SecuritySettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
              <Shield className="w-8 h-8" />
              Security Settings
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Manage your account security and authentication preferences
            </p>
          </div>

          <SecuritySettingsContent />
        </div>
      </main>
    </div>
  );
}

function SecuritySettingsContent() {
  const { status } = JSON.parse(
    document.getElementById("__loader_data")?.textContent || "{}"
  );

  const [setupData, setSetupData] = useState<{
    secret: string;
    backupCodes: string[];
    qrCodeUrl: string;
  } | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  const handleEnable = async () => {
    const formData = new FormData();
    formData.set("intent", "setup-2fa");

    const response = await fetch("/settings/security", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (result.success) {
      setSetupData(result.setupData);
      setShowSetup(true);
    }
  };

  const handleVerify = async (code: string): Promise<boolean> => {
    const formData = new FormData();
    formData.set("intent", "verify-2fa");
    formData.set("code", code);

    const response = await fetch("/settings/security", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    return result.success;
  };

  const handleDisable = async () => {
    if (!confirm("Are you sure you want to disable two-factor authentication?")) {
      return;
    }

    const formData = new FormData();
    formData.set("intent", "disable-2fa");

    await fetch("/settings/security", {
      method: "POST",
      body: formData,
    });

    window.location.reload();
  };

  const handleRegenerateCodes = async (): Promise<string[]> => {
    const formData = new FormData();
    formData.set("intent", "regenerate-codes");

    const response = await fetch("/settings/security", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (result.success) {
      return result.backupCodes;
    }
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Setup Mode */}
      {showSetup && setupData ? (
        <TwoFactorSetupCard
          secret={setupData.secret}
          qrCodeUrl={setupData.qrCodeUrl}
          backupCodes={setupData.backupCodes}
          onVerify={handleVerify}
          onComplete={() => window.location.reload()}
        />
      ) : (
        <>
          {/* Status Card */}
          <TwoFactorStatusCard
            enabled={status?.enabled ?? false}
            verified={status?.verified ?? false}
            backupCodesCount={status?.backupCodesCount ?? 0}
            onEnable={handleEnable}
            onDisable={handleDisable}
          />

          {/* Backup Codes (only when enabled) */}
          {status?.enabled && status?.verified && (
            <TwoFactorBackupCodesCard
              backupCodes={[]} // These are not exposed from server for security
              onRegenerate={handleRegenerateCodes}
            />
          )}
        </>
      )}

      {/* Security Tips */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Security Best Practices
        </h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>✓ Enable two-factor authentication for all your accounts</li>
          <li>✓ Use a unique, strong password for FinanceHub</li>
          <li>✓ Store your backup codes in a secure location</li>
          <li>✓ Regularly review your account activity</li>
          <li>✓ Keep your authenticator app updated</li>
          <li>✓ Never share your verification codes with anyone</li>
        </ul>
      </div>

      {/* How it works */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          How Two-Factor Authentication Works
        </h3>
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold">
              1
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Enable 2FA</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Scan the QR code with your authenticator app to link your account
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold">
              2
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">
                Enter Verification Code
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Verify that your authenticator app is working correctly
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-semibold">
              3
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Save Backup Codes</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Store backup codes securely for account recovery
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center font-semibold">
              ✓
            </div>
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Protected</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your account is now protected with two-factor authentication
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
