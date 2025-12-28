/**
 * Webhook URL Display Component
 * Shows the webhook URL for configuration
 */

import { useState, useCallback } from "react";

interface WebhookUrlDisplayProps {
  provider: "casso" | "sepay";
  baseUrl: string;
}

export function WebhookUrlDisplay({ provider, baseUrl }: WebhookUrlDisplayProps) {
  const [copied, setCopied] = useState(false);

  const webhookUrl = `${baseUrl}/api/webhooks/bank-sync/${provider}`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, [webhookUrl]);

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-mono text-gray-700">
        {webhookUrl}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
      >
        {copied ? (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </>
        )}
      </button>
    </div>
  );
}
