/**
 * AI Service for Column Mapping using Cloudflare Workers AI
 * Leverages the AI binding configured in wrangler.toml
 */

import type { Ai } from "@cloudflare/workers-types";
import type { ColumnMapping } from "../types/csv-import";

/**
 * AI Service class for column mapping operations
 */
export class AIService {
  private ai: Ai;

  constructor(ai: Ai) {
    this.ai = ai;
  }

  /**
   * Use AI to map CSV headers to standard transaction fields
   * @param headers Array of CSV column headers
   * @returns Column mapping object
   */
  async mapColumns(headers: string[]): Promise<ColumnMapping> {
    try {
      const prompt = this.buildMappingPrompt(headers);
      const response = await this.callAI(prompt);
      return this.parseMappingResponse(response, headers);
    } catch (error) {
      console.error("AI column mapping failed:", error);
      // Return empty mapping on failure
      return {};
    }
  }

  /**
   * Build the AI prompt for column mapping
   */
  private buildMappingPrompt(headers: string[]): string {
    const headerList = headers.map((h) => `"${h}"`).join(", ");

    return `You are a CSV column mapping assistant. Your task is to map CSV column headers to standard financial transaction fields.

Available CSV headers: [${headerList}]

Standard fields to map:
- date: Transaction date (e.g., "Date", "Transaction Date", "Posted Date", "Tanggal", "Ngày")
- amount: Transaction amount (e.g., "Amount", "Value", "Debit", "Credit", "Số tiền", "Giá trị")
- description: Transaction description (e.g., "Description", "Details", "Memo", "Note", "Mô tả", "Chi tiết")
- merchant: Merchant or payee name (e.g., "Merchant", "Payee", "Vendor", "Store", "Cửa hàng", "Nhà cung cấp")
- category: Transaction category (e.g., "Category", "Type", "Classification", "Danh mục")
- account: Account name (e.g., "Account", "Bank Account", "Card", "Tài khoản")

Return ONLY a JSON object mapping standard fields to CSV headers. Use null if no match exists.

Example response format:
{
  "date": "Transaction Date",
  "amount": "Amount",
  "description": "Description",
  "merchant": "Payee",
  "category": null,
  "account": null
}

Important rules:
1. Match similar but not identical headers (e.g., "Trans Date" -> "date")
2. Handle multi-language headers (English, Vietnamese, etc.)
3. Be case-insensitive
4. Use null for fields with no matching header
5. Return ONLY the JSON object, no additional text`;
  }

  /**
   * Call Cloudflare Workers AI
   */
  private async callAI(prompt: string): Promise<string> {
    // Use @cf/meta/llama-3.3-8b-instruct model for column mapping
    const response = await this.ai.run("@cf/meta/llama-3.3-8b-instruct" as any, {
      prompt,
      max_tokens: 500,
      temperature: 0.1, // Low temperature for consistent results
    });

    // Extract text response
    if (typeof response === "string") {
      return response.trim();
    }

    // Handle response object
    if (response && typeof response === "object") {
      const resp = response as { response?: string; text?: string };
      return (resp.response || resp.text || "").trim();
    }

    throw new Error("Unexpected AI response format");
  }

  /**
   * Parse AI response and validate against available headers
   */
  private parseMappingResponse(
    response: string,
    availableHeaders: string[]
  ): ColumnMapping {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                       response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("No JSON found in AI response");
      }

      const jsonText = jsonMatch[1] || jsonMatch[0];
      const mapping = JSON.parse(jsonText) as ColumnMapping;

      // Validate that mapped headers exist in CSV
      const validatedMapping: ColumnMapping = {};

      for (const [standardField, csvHeader] of Object.entries(mapping)) {
        if (csvHeader && this.headerExists(csvHeader, availableHeaders)) {
          (validatedMapping as Record<string, string>)[standardField] = csvHeader;
        }
      }

      return validatedMapping;
    } catch (error) {
      console.error("Failed to parse AI mapping response:", error);
      return {};
    }
  }

  /**
   * Check if a header exists in the available headers (case-insensitive)
   */
  private headerExists(header: string, availableHeaders: string[]): boolean {
    const lowerHeader = header.toLowerCase();
    return availableHeaders.some((h) => h.toLowerCase() === lowerHeader);
  }

  /**
   * Fallback: Simple keyword-based mapping (used when AI fails)
   */
  static fallbackMapping(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    const lowerHeaders = headers.map((h) => h.toLowerCase());

    const keywords: Record<string, string[]> = {
      date: ["date", "time", "tanggal", "ngày", "trans date", "transaction date", "posted"],
      amount: ["amount", "value", "sum", "debit", "credit", "số tiền", "giá trị", "qty", "quantity"],
      description: ["description", "desc", "details", "memo", "note", "mô tả", "chi tiết", "narration"],
      merchant: ["merchant", "payee", "vendor", "store", "shop", "cửa hàng", "nhà cung cấp", "recipient"],
      category: ["category", "type", "class", "classification", "danh mục", "loại"],
      account: ["account", "bank", "card", "tài khoản", "credit card", "debit card"],
    };

    for (const [field, fieldKeywords] of Object.entries(keywords)) {
      for (let i = 0; i < lowerHeaders.length; i++) {
        const header = lowerHeaders[i];
        if (fieldKeywords.some((kw) => header.includes(kw))) {
          (mapping as Record<string, string>)[field] = headers[i];
          break;
        }
      }
    }

    return mapping;
  }
}

/**
 * Get AI service instance from request context
 */
export function getAIService(request: Request): AIService {
  const context = request as unknown as { env?: { AI?: Ai } };

  if (!context?.env?.AI) {
    throw new Error("AI binding not available. Check wrangler.toml configuration.");
  }

  return new AIService(context.env.AI);
}
