/**
 * Bank Sync Webhook Endpoint
 * Handles incoming webhooks from Casso and SePay
 */

import type { ActionFunctionArgs } from "react-router";
import { handleWebhook } from "../lib/services/bank-sync.server";
import type { WebhookProvider } from "../lib/services/bank-sync.server";

/**
 * Extract provider from URL path
 * URL pattern: /api/webhooks/bank-sync/:provider
 */
async function action({ request, params }: ActionFunctionArgs) {
  // Only POST requests allowed
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed", message: "Only POST requests are allowed" },
      { status: 405 }
    );
  }

  try {
    // Get provider from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const provider = pathParts[pathParts.length - 1] as WebhookProvider;

    // Validate provider
    if (provider !== "casso" && provider !== "sepay") {
      return Response.json(
        {
          error: "Invalid provider",
          message: "Provider must be 'casso' or 'sepay'",
        },
        { status: 400 }
      );
    }

    // Handle webhook
    const result = await handleWebhook(request, provider);

    if (result.success) {
      return Response.json({
        success: true,
        message: result.message,
        processed: result.processed,
        duplicates: result.duplicates,
      });
    } else {
      return Response.json(
        {
          error: "Webhook processing failed",
          message: result.message,
          errors: result.errors,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Webhook handler error:", error);

    return Response.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export { action };
