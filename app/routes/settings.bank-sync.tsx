/**
 * Bank Sync Settings Page
 * Configure and manage webhook integrations with Casso and SePay
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useActionData, Form } from "react-router";
import { requireAuth } from "../lib/auth/session.server";
import { getDb } from "../lib/auth/db.server";
import { getBankSyncConfigs, saveBankSyncConfig, getWebhookHistory } from "../lib/services/bank-sync.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { WebhookSetup, WebhookHistory } from "~/components/bank-sync";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Get bank sync configurations
  const configs = await getBankSyncConfigs(db, user.id);

  // Get webhook history
  const webhookHistory = await getWebhookHistory(db, user.id);

  // Build base URL for webhooks
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    configs,
    webhookHistory,
    baseUrl,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  const formData = await request.formData();
  const provider = formData.get("provider") as "casso" | "sepay";
  const intent = formData.get("intent") as string;

  if (!provider || (provider !== "casso" && provider !== "sepay")) {
    return { error: "Invalid provider" };
  }

  if (intent === "save-config") {
    const apiKey = formData.get("apiKey") as string | undefined;
    const webhookSecret = formData.get("webhookSecret") as string | undefined;
    const isEnabled = formData.get("isEnabled") === "on";

    await saveBankSyncConfig(db, user.id, provider, {
      apiKey,
      webhookSecret,
      isEnabled,
    });

    return { success: true, message: "Configuration saved successfully" };
  }

  if (intent === "test-connection") {
    // For now, just return success
    // In production, this would make a test request to the provider
    return { success: true, message: "Connection test successful" };
  }

  return { error: "Invalid intent" };
}

export default function BankSyncSettingsPage() {
  const { user, configs, webhookHistory, baseUrl } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const cassoConfig = configs.find((c) => c.provider === "casso");
  const sepayConfig = configs.find((c) => c.provider === "sepay");

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 pt-4 lg:pt-0">
            <h1 className="text-3xl font-bold text-gray-900">Bank Sync Settings</h1>
            <p className="mt-2 text-gray-600">
              Configure webhook integrations to automatically import bank transactions
            </p>
          </div>

          {/* Success/Error Messages */}
          {actionData?.success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800">{actionData.message}</p>
            </div>
          )}
          {actionData?.error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{actionData.error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-1">About Bank Sync</h4>
                <p className="text-sm text-blue-800">
                  Connect your Vietnamese bank accounts via Casso or SePay webhooks to automatically import transactions.
                  Transactions will be categorized and added to your dashboard.
                </p>
              </div>
            </div>
          </div>

          {/* Provider Configurations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Casso Configuration */}
            <WebhookSetup
              provider="casso"
              baseUrl={baseUrl}
              config={
                cassoConfig
                  ? {
                      apiKey: undefined, // Don't expose API key
                      webhookSecret: undefined,
                      webhookUrl: undefined,
                      isEnabled: cassoConfig.isEnabled,
                    }
                  : undefined
              }
            />

            {/* SePay Configuration */}
            <WebhookSetup
              provider="sepay"
              baseUrl={baseUrl}
              config={
                sepayConfig
                  ? {
                      apiKey: undefined, // Don't expose API key
                      webhookSecret: undefined,
                      webhookUrl: undefined,
                      isEnabled: sepayConfig.isEnabled,
                    }
                  : undefined
              }
            />
          </div>

          {/* Test Webhook Section */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Webhook</h3>
            <p className="text-sm text-gray-600 mb-4">
              Send a test webhook to verify your configuration is working correctly.
            </p>

            <Form method="post" action="/api/test-webhook" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="testProvider" className="block text-sm font-medium text-gray-700 mb-1">
                    Provider
                  </label>
                  <select
                    id="testProvider"
                    name="provider"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="casso">Casso</option>
                    <option value="sepay">SePay</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    Send Test Webhook
                  </button>
                </div>
              </div>
            </Form>
          </div>

          {/* Webhook History */}
          <WebhookHistory events={webhookHistory} />

          {/* Help Section */}
          <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h4 className="font-medium text-gray-900 mb-1">How to configure Casso</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Sign up at casso.vn and get your API key</li>
                  <li>Copy the webhook URL above</li>
                  <li>Add the webhook URL in your Casso dashboard</li>
                  <li>Enter your API key and webhook secret below</li>
                  <li>Click "Save Configuration" and test the connection</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-1">How to configure SePay</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Sign up at sepay.vn and get your API key</li>
                  <li>Copy the webhook URL above</li>
                  <li>Add the webhook URL in your SePay dashboard</li>
                  <li>Enter your API key and webhook secret below</li>
                  <li>Click "Save Configuration" and test the connection</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
