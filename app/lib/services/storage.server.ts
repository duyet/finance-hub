/**
 * R2 Storage Service for receipt images
 * Handles direct upload to Cloudflare R2 bucket
 */

import type { CloudflareRequest } from "../auth/db.server";
import type { ReceiptUploadResponse } from "../types/receipt";

/**
 * Get R2 bucket binding from request context
 */
function getR2Bucket(request: CloudflareRequest) {
  return request.context?.cloudflare?.env?.RECEIPTS_BUCKET;
}

/**
 * Generate a unique key for R2 storage
 * Format: receipts/{userId}/{year}/{month}/{timestamp}-{random}.{ext}
 */
function generateR2Key(userId: string, filename: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const timestamp = now.getTime();
  const random = crypto.randomUUID().split("-")[0];

  // Extract file extension
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";

  return `receipts/${userId}/${year}/${month}/${timestamp}-${random}.${ext}`;
}

/**
 * Generate presigned URL for direct upload from client
 * Note: R2 doesn't support presigned URLs directly in Workers.
 * Instead, we'll upload the file from the server.
 */
export async function uploadReceiptToR2(
  request: CloudflareRequest,
  userId: string,
  file: File
): Promise<ReceiptUploadResponse> {
  const bucket = getR2Bucket(request);

  if (!bucket) {
    throw new Error("R2 bucket binding not available");
  }

  try {
    // Validate file
    const validTypes = ["image/jpeg", "image/png", "image/heic"];
    if (!validTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only JPEG, PNG, and HEIC are supported.");
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error("File size must be less than 5MB.");
    }

    // Generate unique key
    const key = generateR2Key(userId, file.name);

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Upload to R2
    await bucket.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
      customMetadata: {
        userId,
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate public URL
    const publicUrl = getPublicUrl(request, key);

    return {
      receiptId: key,
      imageUrl: publicUrl,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };
  } catch (error) {
    console.error("R2 upload error:", error);
    throw new Error(
      `Failed to upload to R2: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Upload from URL (e.g., from camera capture)
 */
export async function uploadReceiptFromUrl(
  request: Request,
  userId: string,
  imageUrl: string,
  filename?: string
): Promise<ReceiptUploadResponse> {
  const bucket = getR2Bucket(request);

  if (!bucket) {
    throw new Error("R2 bucket binding not available");
  }

  try {
    // Fetch image from URL
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    // Validate size
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (arrayBuffer.byteLength > maxSize) {
      throw new Error("File size must be less than 5MB.");
    }

    // Generate unique key
    const key = generateR2Key(userId, filename || "receipt.jpg");

    // Upload to R2
    await bucket.put(key, arrayBuffer, {
      httpMetadata: {
        contentType,
      },
      customMetadata: {
        userId,
        sourceUrl: imageUrl,
        uploadedAt: new Date().toISOString(),
      },
    });

    // Generate public URL
    const publicUrl = getPublicUrl(request, key);

    return {
      receiptId: key,
      imageUrl: publicUrl,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };
  } catch (error) {
    console.error("R2 upload from URL error:", error);
    throw new Error(
      `Failed to upload from URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Get public URL for a stored receipt
 * In production, this should use a custom domain or R2 public bucket
 */
function getPublicUrl(request: CloudflareRequest, key: string): string {
  // Check if we have a custom domain configured
  const customDomain = request.context?.cloudflare?.env?.R2_PUBLIC_URL;

  if (customDomain) {
    return `${customDomain}/${key}`;
  }

  // Fallback: Use R2's built-in public URL pattern
  // This requires the bucket to be configured as public
  const bucketName = request.context?.cloudflare?.env?.BUCKET_NAME || "finance-hub-receipts";
  return `https://${bucketName}.r2.dev/${key}`;
}

/**
 * Delete receipt from R2
 */
export async function deleteReceiptFromR2(
  request: CloudflareRequest,
  key: string
): Promise<boolean> {
  const bucket = getR2Bucket(request);

  if (!bucket) {
    throw new Error("R2 bucket binding not available");
  }

  try {
    await bucket.delete(key);
    return true;
  } catch (error) {
    console.error("R2 delete error:", error);
    return false;
  }
}

/**
 * Check if file exists in R2
 */
export async function checkReceiptExists(
  request: Request,
  key: string
): Promise<boolean> {
  const bucket = getR2Bucket(request);

  if (!bucket) {
    return false;
  }

  try {
    const object = await bucket.head(key);
    return object !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get receipt image metadata
 */
export async function getReceiptMetadata(
  request: Request,
  key: string
): Promise<{ size: number; contentType: string } | null> {
  const bucket = getR2Bucket(request);

  if (!bucket) {
    return null;
  }

  try {
    const object = await bucket.head(key);

    if (!object) {
      return null;
    }

    return {
      size: object.size,
      contentType: object.httpMetadata?.contentType || "application/octet-stream",
    };
  } catch (error) {
    console.error("R2 metadata error:", error);
    return null;
  }
}

/**
 * Generate thumbnail for receipt image
 * This is a placeholder - actual thumbnail generation would require image processing
 */
export async function generateThumbnail(
  request: Request,
  key: string,
  width: number = 300,
  height: number = 300
): Promise<string | null> {
  // TODO: Implement thumbnail generation using Workers AI or image processing service
  // For now, return the original URL
  return getPublicUrl(request, key);
}
