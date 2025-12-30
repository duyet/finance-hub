/**
 * OCR Service for receipt processing using Cloudflare Workers AI
 * Supports multiple vision models: Gemma 3 (recommended), Llama 3.2 Vision
 *
 * Model Selection (via env.OCR_MODEL or default):
 * - gemma-3: @cf/google/gemma-3-12b-it (multimodal, 140+ languages, 128K context)
 * - llama-3.2: @cf/meta/llama-3.2-11b-vision-instruct (fallback)
 */

import type { CloudflareRequest } from "../auth/db.server";
import { getDb } from "../auth/db.server";
import type {
  ReceiptData,
  ReceiptRecord,
  ReceiptProcessingStatus,
  OcrProcessingOptions,
} from "../types/receipt";

type OcrModel = "gemma-3" | "llama-3.2";

const DEFAULT_MODEL: OcrModel = "gemma-3";

function getOcrModel(request: CloudflareRequest): OcrModel {
  const envModel = request.context?.cloudflare?.env?.OCR_MODEL as string;
  if (envModel === "llama-3.2" || envModel === "gemma-3") {
    return envModel;
  }
  return DEFAULT_MODEL;
}

// AI binding type with run method (Cloudflare Workers AI)
interface AiBinding {
  run(model: string, inputs: unknown, options?: Record<string, unknown>): Promise<unknown>;
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

/**
 * Get AI binding from request context
 */
function getAI(request: CloudflareRequest): AiBinding | undefined {
  const ai = request.context?.cloudflare?.env?.AI;
  return ai as unknown as AiBinding | undefined;
}

/**
 * Get R2 bucket binding from request context
 */
function getR2Bucket(request: CloudflareRequest) {
  return request.context?.cloudflare?.env?.RECEIPTS_BUCKET;
}

/**
 * Get Queue binding from request context
 */
function getQueue(request: CloudflareRequest) {
  return request.context?.cloudflare?.env?.QUEUE;
}

/**
 * Process receipt image with Workers AI
 * Supports Gemma 3 (multimodal) and Llama 3.2 Vision models
 */
export async function processReceiptWithAI(
  request: CloudflareRequest,
  imageUrl: string,
  options: OcrProcessingOptions = {}
): Promise<ReceiptData> {
  const ai = getAI(request);

  if (!ai) {
    throw new Error("AI binding not available");
  }

  const {
    detectCurrency = true,
    defaultCurrency = "VND",
    extractLineItems = true,
    locale = "en",
  } = options;

  const model = getOcrModel(request);

  try {
    // Fetch and convert image to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
    const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

    // Build prompt for receipt extraction
    const prompt = buildExtractionPrompt(
      detectCurrency,
      defaultCurrency,
      extractLineItems,
      locale
    );

    let extractedText: string;

    // Get AI Gateway ID for observability
    const gatewayId = request.context?.cloudflare?.env?.AI_GATEWAY_ID;
    const gatewayOptions = gatewayId ? { gateway: { id: gatewayId } } : {};

    if (model === "gemma-3") {
      // Use Gemma 3 with messages API for multimodal input
      const modelResponse = await ai.run("@cf/google/gemma-3-12b-it", {
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: imageDataUrl }
              }
            ]
          }
        ],
        max_tokens: 2048,
        temperature: 0.2, // Lower temperature for more consistent extraction
      }, gatewayOptions);
      extractedText = (modelResponse as { response?: string; text?: string }).response ||
                       (modelResponse as { response?: string; text?: string }).text || "";
    } else {
      // Use Llama 3.2 Vision as fallback
      const modelResponse = await ai.run("@cf/meta/llama-3.2-11b-vision-instruct", {
        image: [imageDataUrl],
        prompt: prompt,
        max_tokens: 2048,
      }, gatewayOptions);
      extractedText = (modelResponse as { response?: string; text?: string }).response ||
                       (modelResponse as { response?: string; text?: string }).text || "";
    }

    // Parse the response
    const parsedData = parseReceiptResponse(extractedText, defaultCurrency);

    // Calculate confidence score
    const confidence = calculateConfidence(parsedData);

    return {
      ...parsedData,
      confidence,
      rawText: extractedText,
      modelUsed: model,
    };
  } catch (error) {
    console.error("OCR processing error:", error);
    throw new Error(
      `Failed to process receipt with AI: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Build extraction prompt for OCR models
 */
function buildExtractionPrompt(
  detectCurrency: boolean,
  defaultCurrency: string,
  extractLineItems: boolean,
  locale: string
): string {
  const isVietnamese = locale === "vi";

  const basePrompt = isVietnamese
    ? `Trích xuất thông tin sau từ hóa đơn này:
- Tên cửa hàng/merchant
- Ngày giao dịch
- Tổng số tiền
- Loại tiền tệ (nếu có, nếu không thì dùng ${defaultCurrency})
`

    : `Extract the following information from this receipt:
- Merchant name
- Transaction date
- Total amount
- Currency (if present, otherwise use ${defaultCurrency})
`;

  let lineItemsPrompt = "";
  if (extractLineItems) {
    lineItemsPrompt = isVietnamese
      ? `- Các mặt hàng (line items) nếu có thể đọc được: tên, số lượng, đơn giá, thành tiền
- Thuế (tax) nếu có`
      : `- Line items (if readable): description, quantity, unit price, total price
- Tax amount (if present)`;
  }

  const jsonFormatPrompt = isVietnamese
    ? `

Trả về kết quả dưới dạng JSON với cấu trúc sau:
\`\`\`json
{
  "merchantName": "string or null",
  "date": "YYYY-MM-DD or null",
  "totalAmount": number or null,
  "currency": "string or null",
  "lineItems": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number
    }
  ] or [],
  "taxAmount": number or null
}
\`\`\`

Nếu không tìm thấy thông tin nào, đặt giá trị là null.
Chỉ trả về JSON, không thêm giải thích nào khác.`
    : `

Return the result as JSON with this structure:
\`\`\`json
{
  "merchantName": "string or null",
  "date": "YYYY-MM-DD or null",
  "totalAmount": number or null,
  "currency": "string or null",
  "lineItems": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number
    }
  ] or [],
  "taxAmount": number or null
}
\`\`\`

If a field is not found, set it to null.
Return ONLY the JSON, no additional text.`;

  return basePrompt + lineItemsPrompt + jsonFormatPrompt;
}

/**
 * Parse AI response and extract structured data
 */
function parseReceiptResponse(
  responseText: string,
  defaultCurrency: string
): Omit<ReceiptData, "confidence" | "rawText"> {
  try {
    // Try to extract JSON from response
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                     responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const jsonString = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonString);

    // Extract and validate fields
    let merchantName: string | null = parsed.merchantName || null;
    const date: string | null = parsed.date || null;
    let totalAmount: number | null = parsed.totalAmount || null;
    const currency: string | null = parsed.currency || defaultCurrency;
    let taxAmount: number | null = parsed.taxAmount || null;
    const lineItems = parsed.lineItems || [];

    // Clean up merchant name
    if (merchantName) {
      merchantName = merchantName.trim().substring(0, 200);
    }

    // Validate and clean total amount
    if (totalAmount !== null) {
      totalAmount = Math.abs(totalAmount);
      if (isNaN(totalAmount)) {
        totalAmount = null;
      }
    }

    // Validate tax amount
    if (taxAmount !== null) {
      taxAmount = Math.abs(taxAmount);
      if (isNaN(taxAmount)) {
        taxAmount = null;
      }
    }

    return {
      merchantName,
      date,
      totalAmount,
      currency,
      lineItems,
      taxAmount,
    };
  } catch (error) {
    console.error("Failed to parse receipt response:", error);
    // Return empty data on parse failure
    return {
      merchantName: null,
      date: null,
      totalAmount: null,
      currency: defaultCurrency,
      lineItems: [],
      taxAmount: null,
    };
  }
}

/**
 * Calculate confidence score based on extracted data completeness
 */
function calculateConfidence(data: Omit<ReceiptData, "confidence" | "rawText">): number {
  let score = 0;
  const maxScore = 4;

  // Merchant name found
  if (data.merchantName) {
    score += 1;
  }

  // Date found
  if (data.date) {
    score += 1;
  }

  // Total amount found
  if (data.totalAmount !== null && data.totalAmount !== undefined && data.totalAmount > 0) {
    score += 1;
  }

  // Line items found
  if (data.lineItems && data.lineItems.length > 0) {
    score += 1;
  }

  return score / maxScore;
}

/**
 * Create receipt record in database
 */
export async function createReceiptRecord(
  request: CloudflareRequest,
  userId: string,
  imageUrl: string,
  extractedData: ReceiptData,
  confidence: number
): Promise<ReceiptRecord> {
  const db = getDb(request);
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO receipts (
        id, user_id, image_url, status, extracted_data,
        confidence, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
    .bind(
      id,
      userId,
      imageUrl,
      confidence >= 0.7 ? "completed" : "needs_review",
      JSON.stringify(extractedData),
      confidence
    )
    .run();

  return getReceiptById(request, id, userId) as Promise<ReceiptRecord>;
}

/**
 * Update receipt processing status
 */
export async function updateReceiptStatus(
  request: CloudflareRequest,
  receiptId: string,
  userId: string,
  status: ReceiptProcessingStatus,
  errorMessage?: string
): Promise<void> {
  const db = getDb(request);

  const updates: string[] = ["status = ?", "updated_at = CURRENT_TIMESTAMP"];
  const params: (string | number)[] = [status];

  if (errorMessage) {
    updates.push("error_message = ?");
    params.push(errorMessage);
  }

  if (status === "completed") {
    updates.push("processed_at = CURRENT_TIMESTAMP");
  }

  params.push(receiptId, userId);

  await db
    .prepare(`UPDATE receipts SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`)
    .bind(...params)
    .run();
}

/**
 * Get receipt by ID
 */
export async function getReceiptById(
  request: CloudflareRequest,
  receiptId: string,
  userId: string
): Promise<ReceiptRecord | null> {
  const db = getDb(request);

  const result = await db
    .prepare(
      `SELECT * FROM receipts WHERE id = ? AND user_id = ?`
    )
    .bind(receiptId, userId)
    .first<{
      id: string;
      user_id: string;
      image_url: string;
      thumbnail_url: string | null;
      status: ReceiptProcessingStatus;
      extracted_data: string;
      confidence: number;
      error_message: string | null;
      transaction_id: string | null;
      created_at: string;
      updated_at: string;
      processed_at: string | null;
    }>();

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    userId: result.user_id,
    imageUrl: result.image_url,
    thumbnailUrl: result.thumbnail_url || undefined,
    status: result.status,
    extractedData: JSON.parse(result.extracted_data) as ReceiptData,
    confidence: result.confidence,
    errorMessage: result.error_message || undefined,
    transactionId: result.transaction_id || undefined,
    createdAt: new Date(result.created_at),
    updatedAt: new Date(result.updated_at),
    processedAt: result.processed_at ? new Date(result.processed_at) : undefined,
  };
}

/**
 * Get user's receipts with pagination
 */
export async function getUserReceipts(
  request: CloudflareRequest,
  userId: string,
  page: number = 1,
  pageSize: number = 20,
  status?: ReceiptProcessingStatus
): Promise<{ receipts: ReceiptRecord[]; total: number }> {
  const db = getDb(request);

  const conditions: string[] = ["user_id = ?"];
  const params: (string | number)[] = [userId];

  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }

  const whereClause = conditions.join(" AND ");

  // Get total count
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM receipts WHERE ${whereClause}`)
    .bind(...params)
    .first<{ count: number }>() as { count: number };

  const total = countResult.count;

  // Get receipts
  const offset = (page - 1) * pageSize;
  params.push(pageSize, offset);

  const receipts = await db
    .prepare(
      `SELECT * FROM receipts WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(...params)
    .all();

  const parsedReceipts = receipts.results?.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url,
    status: row.status,
    extractedData: JSON.parse(row.extracted_data),
    confidence: row.confidence,
    errorMessage: row.error_message,
    transactionId: row.transaction_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    processedAt: row.processed_at ? new Date(row.processed_at) : null,
  })) || [];

  return {
    receipts: parsedReceipts,
    total,
  };
}

/**
 * Link receipt to transaction
 */
export async function linkReceiptToTransaction(
  request: CloudflareRequest,
  receiptId: string,
  userId: string,
  transactionId: string
): Promise<void> {
  const db = getDb(request);

  await db
    .prepare(
      `UPDATE receipts
       SET transaction_id = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
    .bind(transactionId, receiptId, userId)
    .run();
}

/**
 * Delete receipt
 */
export async function deleteReceipt(
  request: CloudflareRequest,
  receiptId: string,
  userId: string
): Promise<boolean> {
  const db = getDb(request);

  const result = await db
    .prepare(`DELETE FROM receipts WHERE id = ? AND user_id = ?`)
    .bind(receiptId, userId)
    .run();

  return (result.meta?.changes || 0) > 0;
}
