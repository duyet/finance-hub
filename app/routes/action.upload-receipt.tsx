/**
 * Action route for uploading receipt images to R2
 * POST /action/upload-receipt
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { getUserFromSession } from "../lib/auth/session.server";
import { getDb } from "../lib/auth/db.server";
import {
  uploadReceiptToR2,
  uploadReceiptFromUrl,
} from "../lib/services/storage.server";
import { receiptsCrud } from "../lib/db/receipts.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request);

  if (!user) {
    return redirect("/auth/login");
  }

  return Response.json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await getUserFromSession(request);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const action = formData.get("_action");

    if (action === "upload-file") {
      // Handle file upload
      const file = formData.get("file") as File | null;

      if (!file) {
        return Response.json({ error: "No file provided" }, { status: 400 });
      }

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/heic"];
      if (!validTypes.includes(file.type)) {
        return Response.json(
          { error: "Invalid file type. Only JPEG, PNG, and HEIC are supported." },
          { status: 400 }
        );
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return Response.json(
          { error: "File size must be less than 5MB." },
          { status: 400 }
        );
      }

      // Upload to R2
      const uploadResult = await uploadReceiptToR2(request, user.id, file);

      // Create receipt record with pending status
      const db = getDb(request);
      await receiptsCrud.createReceipt(db, {
        id: crypto.randomUUID(),
        userId: user.id,
        imageUrl: uploadResult.imageUrl,
        status: "pending",
        extractedData: {},
        confidence: 0,
      });

      return Response.json({
        success: true,
        imageUrl: uploadResult.imageUrl,
        receiptId: uploadResult.receiptId,
      });
    }

    if (action === "upload-url") {
      // Handle upload from URL (e.g., camera capture)
      const imageUrl = formData.get("imageUrl") as string | null;
      const filename = formData.get("filename") as string | null;

      if (!imageUrl) {
        return Response.json({ error: "No image URL provided" }, { status: 400 });
      }

      // Upload from URL to R2
      const uploadResult = await uploadReceiptFromUrl(
        request,
        user.id,
        imageUrl,
        filename || undefined
      );

      // Create receipt record with pending status
      const db = getDb(request);
      await receiptsCrud.createReceipt(db, {
        id: crypto.randomUUID(),
        userId: user.id,
        imageUrl: uploadResult.imageUrl,
        status: "pending",
        extractedData: {},
        confidence: 0,
      });

      return Response.json({
        success: true,
        imageUrl: uploadResult.imageUrl,
        receiptId: uploadResult.receiptId,
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Receipt upload error:", error);
    return Response.json(
      {
        error: "Failed to upload receipt",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
