/**
 * Action route for processing receipt with OCR AI
 * POST /action/process-receipt
 */

import type { ActionFunctionArgs } from "react-router";
import { getUserFromSession } from "../lib/auth/session.server";
import { getDb } from "../lib/auth/db.server";
import {
  processReceiptWithAI,
  createReceiptRecord,
  updateReceiptStatus,
} from "../lib/services/ocr.server";
import { receiptsCrud } from "../lib/db/receipts.server";
import { suggestCategoryCombined } from "../lib/services/category-suggestion.server";
import type { ReceiptData, CategorySuggestion } from "../lib/types/receipt";

export async function action({ request }: ActionFunctionArgs) {
  const user = await getUserFromSession(request);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const imageUrl = formData.get("imageUrl") as string;
    const receiptId = formData.get("receiptId") as string;
    const locale = (formData.get("locale") as string) || "en";
    const detectCurrency = formData.get("detectCurrency") === "true";
    const extractLineItems = formData.get("extractLineItems") !== "false";

    if (!imageUrl) {
      return Response.json({ error: "No image URL provided" }, { status: 400 });
    }

    const db = getDb(request);

    // Update status to processing
    await receiptsCrud.updateReceipt(
      db,
      receiptId,
      user.id,
      {
        status: "processing",
      }
    );

    // Process with OCR AI
    const extractedData = await processReceiptWithAI(request, imageUrl, {
      detectCurrency,
      defaultCurrency: locale === "vi" ? "VND" : "USD",
      extractLineItems,
      locale,
    });

    // Generate category suggestions if merchant name found
    let categorySuggestions: CategorySuggestion[] = [];
    if (extractedData.merchantName) {
      categorySuggestions = await suggestCategoryCombined(
        request,
        extractedData.merchantName,
        user.id
      );
    }

    // Update receipt with extracted data
    const confidence = extractedData.confidence || 0;
    const status =
      confidence >= 0.7
        ? "completed"
        : confidence >= 0.4
        ? "needs_review"
        : "failed";

    await receiptsCrud.updateReceipt(
      db,
      receiptId,
      user.id,
      {
        status,
        extractedData,
        confidence,
        processedAt: new Date(),
      }
    );

    return Response.json({
      success: true,
      receiptId,
      extractedData: {
        ...extractedData,
        date: extractedData.date
          ? new Date(extractedData.date).toISOString().split("T")[0]
          : null,
      },
      confidence,
      status,
      categorySuggestions: categorySuggestions.slice(0, 3), // Top 3
    });
  } catch (error) {
    console.error("Receipt processing error:", error);

    // Try to update status to failed
    try {
      const formData = await request.formData();
      const receiptId = formData.get("receiptId") as string;
      const db = getDb(request);

      if (receiptId) {
        await receiptsCrud.updateReceipt(db, receiptId, user.id, {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch (updateError) {
      console.error("Failed to update receipt status:", updateError);
    }

    return Response.json(
      {
        error: "Failed to process receipt",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
