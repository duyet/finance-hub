/**
 * Test Webhook Endpoint
 * Allows testing webhook handling without external providers
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { handleWebhook } from "../lib/services/bank-sync.server";

/**
 * GET - Show test webhook form
 */
export async function loader({ request }: LoaderFunctionArgs) {
  return Response.json({
    message: "Webhook test endpoint",
    methods: {
      GET: "Show this message",
      POST: "Test webhook with sample data",
    },
    example: {
      casso: {
        error: 0,
        data: [
          {
            id: "test_casso_123",
            transaction_date: new Date().toISOString().split("T")[0],
            amount: 500000,
            content: "Transfer from NGUYEN VAN A - Test payment",
            code: "TEST123",
            reference_number: "REF_CASSO_" + Date.now(),
            sub_account: "Savings Account",
            pay_method: "BANK_TRANSFER",
          },
        ],
      },
      sepay: {
        transaction_id: "test_sepay_456",
        transaction_date: new Date().toISOString().split("T")[0],
        amount: 300000,
        content: "Coffee at Highlands - Test",
        code: "SEPAY789",
        reference_number: "REF_SEPAY_" + Date.now(),
        bank_account: "1234567890",
        bank_name: "VCB",
      },
    },
  });
}

/**
 * POST - Test webhook with provided data
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const provider = body.provider as "casso" | "sepay";

    if (!provider || (provider !== "casso" && provider !== "sepay")) {
      return Response.json(
        { error: "Invalid provider. Use 'casso' or 'sepay'" },
        { status: 400 }
      );
    }

    // Create mock request with webhook data
    const webhookData = provider === "casso" ? body.casso : body.sepay;

    if (!webhookData) {
      return Response.json(
        { error: `Missing ${provider} data` },
        { status: 400 }
      );
    }

    // Create a new request with the webhook payload
    const mockRequest = new Request(request.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(provider === "casso"
          ? { "X-Casso-Signature": "test_signature" }
          : { "SePay-Signature": "test_signature" }),
      },
      body: JSON.stringify(webhookData),
    });

    // Handle webhook
    const result = await handleWebhook(mockRequest, provider);

    return Response.json({
      success: result.success,
      message: result.message,
      processed: result.processed,
      duplicates: result.duplicates,
      errors: result.errors,
      provider,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test webhook error:", error);

    return Response.json(
      {
        error: "Test failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
