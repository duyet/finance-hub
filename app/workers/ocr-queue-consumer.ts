/**
 * OCR Queue Consumer Worker
 * Processes receipt OCR jobs asynchronously using Gemma 3 or Llama 3.2 Vision
 *
 * Model Selection (via env.OCR_MODEL or default):
 * - gemma-3: @cf/google/gemma-3-12b-it (multimodal, 140+ languages, 128K context)
 * - llama-3.2: @cf/meta/llama-3.2-11b-vision-instruct (fallback)
 */

type OcrModel = "gemma-3" | "llama-3.2";

const DEFAULT_MODEL: OcrModel = "gemma-3";

function getOcrModel(env: any): OcrModel {
  const envModel = env.OCR_MODEL as string;
  if (envModel === "llama-3.2" || envModel === "gemma-3") {
    return envModel;
  }
  return DEFAULT_MODEL;
}

export interface OcrJob {
  type: "process_receipt";
  receiptId: string;
  imageUrl: string;
  userId: string;
  options: {
    detectCurrency: boolean;
    defaultCurrency: string;
    extractLineItems: boolean;
    locale: string;
  };
}

export interface QueueMessage {
  id: string;
  body: string;
  timestamp: number;
  ack(): void;
  retry(): void;
}

export interface QueueBatch {
  messages: QueueMessage[];
  queue: string;
}

export default {
  async queue(batch: QueueBatch, env: any): Promise<void> {
    for (const message of batch.messages) {
      try {
        const job: OcrJob = JSON.parse(message.body);

        if (job.type === "process_receipt") {
          await processReceiptJob(job, env);
        }

        // Acknowledge message
        message.ack();
      } catch (error) {
        console.error("Failed to process OCR job:", error);

        // Retry logic could be implemented here
        // message.retry();
      }
    }
  },
};

async function processReceiptJob(job: OcrJob, env: any) {
  const { receiptId, imageUrl, userId, options } = job;

  // Update status to processing
  await env.DB.prepare(
    `UPDATE receipts
     SET status = 'processing', updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`
  )
    .bind(receiptId, userId)
    .run();

  try {
    // Process with OCR AI
    const extractedData = await processReceiptWithAI(env, imageUrl, options);

    // Generate category suggestions
    let categorySuggestions = [];
    if (extractedData.merchantName) {
      categorySuggestions = await suggestCategories(
        env,
        extractedData.merchantName,
        userId
      );
    }

    // Update receipt with results
    const confidence = extractedData.confidence || 0;
    const status =
      confidence >= 0.7
        ? "completed"
        : confidence >= 0.4
        ? "needs_review"
        : "failed";

    await env.DB.prepare(
      `UPDATE receipts
       SET status = ?,
           extracted_data = ?,
           confidence = ?,
           processed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
      .bind(
        status,
        JSON.stringify(extractedData),
        confidence,
        receiptId,
        userId
      )
      .run();
  } catch (error) {
    // Update status to failed
    await env.DB.prepare(
      `UPDATE receipts
       SET status = 'failed',
           error_message = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
      .bind(error instanceof Error ? error.message : "Unknown error", receiptId, userId)
      .run();

    throw error;
  }
}

async function processReceiptWithAI(
  env: any,
  imageUrl: string,
  options: OcrJob["options"]
): Promise<any> {
  const { detectCurrency, defaultCurrency, extractLineItems, locale } = options;
  const model = getOcrModel(env);

  // Build prompt
  const prompt = buildExtractionPrompt(
    detectCurrency,
    defaultCurrency,
    extractLineItems,
    locale
  );

  // Fetch and convert image
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");
  const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";
  const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

  let extractedText: string;

  if (model === "gemma-3") {
    // Use Gemma 3 with messages API for multimodal input
    const modelResponse = await env.AI.run("@cf/google/gemma-3-12b-it", {
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
    });
    extractedText = modelResponse.response || modelResponse.text || "";
  } else {
    // Use Llama 3.2 Vision as fallback
    const modelResponse = await env.AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
      image: [imageDataUrl],
      prompt: prompt,
      max_tokens: 2048,
    });
    extractedText = modelResponse.response || modelResponse.text || "";
  }

  const parsed = parseReceiptResponse(extractedText, defaultCurrency);
  return { ...parsed, modelUsed: model };
}

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
      ? `- Các mặt hàng (line items) nếu có thể đọc được
- Thuế (tax) nếu có`
      : `- Line items (if readable)
- Tax amount (if present)`;
  }

  const jsonFormatPrompt = isVietnamese
    ? `\n\nTrả về kết quả dưới dạng JSON.`
    : `\n\nReturn the result as JSON.`;

  return basePrompt + lineItemsPrompt + jsonFormatPrompt;
}

function parseReceiptResponse(responseText: string, defaultCurrency: string): any {
  try {
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                     responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No JSON found");
    }

    const jsonString = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonString);

    return {
      merchantName: parsed.merchantName || null,
      date: parsed.date || null,
      totalAmount: parsed.totalAmount || null,
      currency: parsed.currency || defaultCurrency,
      lineItems: parsed.lineItems || [],
      taxAmount: parsed.taxAmount || null,
    };
  } catch {
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

async function suggestCategories(
  env: any,
  merchantName: string,
  userId: string
): Promise<Array<{ categoryId: string; categoryName: string; confidence: number }>> {
  // Get user's categories
  const categories = await env.DB.prepare(
    `SELECT id, name FROM categories WHERE user_id = ? ORDER BY name`
  )
    .bind(userId)
    .all();

  if (!categories.results || categories.results.length === 0) {
    return [];
  }

  // Generate merchant embedding
  const merchantResponse = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: merchantName,
  });

  const merchantEmbedding = merchantResponse.embedding || merchantResponse.data?.[0]?.embedding || [];

  if (!Array.isArray(merchantEmbedding) || merchantEmbedding.length === 0) {
    return [];
  }

  // Calculate similarities
  const suggestions = await Promise.all(
    categories.results.map(async (category: any) => {
      const categoryResponse = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: category.name,
      });

      const categoryEmbedding =
        categoryResponse.embedding || categoryResponse.data?.[0]?.embedding || [];

      if (!Array.isArray(categoryEmbedding) || categoryEmbedding.length === 0) {
        return { categoryId: category.id, categoryName: category.name, confidence: 0 };
      }

      const similarity = cosineSimilarity(merchantEmbedding, categoryEmbedding);

      return {
        categoryId: category.id,
        categoryName: category.name,
        confidence: similarity,
      };
    })
  );

  return suggestions
    .filter((s) => s.confidence >= 0.3)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
