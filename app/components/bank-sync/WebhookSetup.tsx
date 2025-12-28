/**
 * Webhook Setup Component
 * Form to configure webhook settings for Casso/SePay
 */

import { Form } from "react-router";
import { useState } from "react";
import { WebhookUrlDisplay } from "./WebhookUrlDisplay";
import { ConnectionStatus } from "./ConnectionStatus";

interface WebhookSetupProps {
  provider: "casso" | "sepay";
  baseUrl: string;
  config?: {
    apiKey?: string;
    webhookSecret?: string;
    webhookUrl?: string;
    isEnabled: boolean;
  };
  testStatus?: "idle" | "testing" | "success" | "error";
  onTest?: () => void;
}

export function WebhookSetup({ provider, baseUrl, config, testStatus = "idle", onTest }: WebhookSetupProps) {
  const [showSecret, setShowSecret] = useState(false);

  const providerName = provider === "casso" ? "Casso" : "SePay";
  const hasConfig = config?.apiKey || config?.webhookSecret;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{providerName} Integration</h3>
        <ConnectionStatus status={config?.isEnabled ? "connected" : "disconnected"} />
      </div>

      <div className="space-y-4">
        {/* Webhook URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Webhook URL
          </label>
          <WebhookUrlDisplay provider={provider} baseUrl={baseUrl} />
          <p className="mt-2 text-sm text-gray-500">
            Copy this URL and paste it into your {providerName} dashboard
          </p>
        </div>

        {/* Configuration Form */}
        <Form method="post" className="space-y-4">
          <input type="hidden" name="provider" value={provider} />
          <input type="hidden" name="intent" value="save-config" />

          {/* API Key */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="text"
              id="apiKey"
              name="apiKey"
              defaultValue={config?.apiKey}
              placeholder={`Enter your ${providerName} API key`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Webhook Secret */}
          <div>
            <label htmlFor="webhookSecret" className="block text-sm font-medium text-gray-700 mb-1">
              Webhook Secret
            </label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                id="webhookSecret"
                name="webhookSecret"
                defaultValue={config?.webhookSecret}
                placeholder={`Enter your ${providerName} webhook secret`}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecret ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isEnabled"
              name="isEnabled"
              defaultChecked={config?.isEnabled ?? true}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isEnabled" className="text-sm text-gray-700">
              Enable webhook processing
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Configuration
            </button>
            <button
              type="button"
              onClick={onTest}
              disabled={testStatus === "testing" || !hasConfig}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testStatus === "testing" ? "Testing..." : "Test Connection"}
            </button>
          </div>
        </Form>

        {/* Test Status */}
        {testStatus === "success" && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">Connection test successful!</p>
          </div>
        )}
        {testStatus === "error" && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">Connection test failed. Please check your configuration.</p>
          </div>
        )}
      </div>
    </div>
  );
}
