/**
 * Transaction Categorization Service
 * Auto-categorizes bank transactions using vector embeddings and AI
 *
 * PRD Specification:
 * "Auto-Categorization: The text description is embedded using @cf/baai/bge-base-en-v1.5.
 * The vector is compared (cosine similarity) against the user's category list to suggest a category."
 */

import type { D1Database, Ai, KVNamespace } from "@cloudflare/workers-types";
import type { Env } from "../auth/db.server";

/**
 * Categorization rule
 */
interface CategorizationRule {
  pattern: RegExp;
  category: string;
  priority: number;
}

/**
 * Category suggestion with confidence score
 */
export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  similarity: number;
}

/**
 * Embedding vector cache structure
 */
interface CachedEmbedding {
  vector: number[];
  timestamp: number;
}

/**
 * Vietnamese transaction categorization rules
 * Ordered by priority (highest first)
 */
const CATEGORIZATION_RULES: CategorizationRule[] = [
  // Transportation
  { pattern: /grab|uber|be|gojek|xemia|xe om/i, category: "Transport", priority: 100 },
  { pattern: /gas|petrol|xang|dau|nhien lieu|iw|iocal|shell|pvoil/i, category: "Transport", priority: 90 },
  { pattern: /parking|baix|gui xe|gửi xe/i, category: "Transport", priority: 80 },
  { pattern: /myway|map|thanet|etoll|vetc|autosock/i, category: "Transport", priority: 70 },

  // Food & Drink
  { pattern: /coffee|cafe|cà phê|highlands|the coffee house|phê la/i, category: "Food & Drink", priority: 100 },
  { pattern: /starbucks| Highlands|phuc long|trung nguyen/i, category: "Food & Drink", priority: 95 },
  { pattern: /shisha|hookah|trà sữa|milktea|che|trà/i, category: "Food & Drink", priority: 90 },
  { pattern: /đồ ăn|food|an nhanh|an vat|ăn vặt|nhà hàng|nhà hàng/i, category: "Food & Drink", priority: 85 },
  { pattern: /restaurant|quán ăn|cơm|phở|bún|mì|bánh mì/i, category: "Food & Drink", priority: 80 },
  { pattern: /delivery|now|shopeefood|grabfood|be food|food delivery/i, category: "Food & Drink", priority: 75 },

  // Shopping
  { pattern: /shopee|lazada|tiki|sendo|tiktok shop|tgdd/i, category: "Shopping", priority: 100 },
  { pattern: /muasamcong|chotot|vatgia|5giay/i, category: "Shopping", priority: 90 },
  { pattern: /thời trang|fashion|clothing|quần áo|giày dép/i, category: "Shopping", priority: 80 },
  { pattern: /điện thoại|phone|laptop|tablet|máy tính|electronics/i, category: "Shopping", priority: 75 },
  { pattern: /siêu thị|supermarket|coop|winmart|lotte|aeon/i, category: "Shopping", priority: 70 },

  // Entertainment
  { pattern: /netflix|youtube|spotify|apple music|tiktok|facebook|ads/i, category: "Entertainment", priority: 100 },
  { pattern: /game|steam|playstation|xbox|nintendo|app store|google play/i, category: "Entertainment", priority: 90 },
  { pattern: /rap|cinema|phim|movie|galaxy|cgv|lotte|beta/i, category: "Entertainment", priority: 80 },
  { pattern: /karaoke|giải trí|entertainment/i, category: "Entertainment", priority: 70 },

  // Bills & Utilities
  { pattern: /electric|điện|evn|electricity|power/i, category: "Bills & Utilities", priority: 100 },
  { pattern: /water|nước|water supply|cap nuoc/i, category: "Bills & Utilities", priority: 95 },
  { pattern: /internet|fpt|viettel|vnpt|wifi|network/i, category: "Bills & Utilities", priority: 90 },
  { pattern: /gas|gas cylinder|bình gas|cap gas/i, category: "Bills & Utilities", priority: 85 },
  { pattern: /tv|truyền hình|cable|k\+/i, category: "Bills & Utilities", priority: 80 },
  { pattern: /mobile|phone|di động|điện thoại|sim|nạp tiền|topup/i, category: "Bills & Utilities", priority: 75 },

  // Health
  { pattern: /hospital|bệnh viện|phòng khám|clinic|medical/i, category: "Health", priority: 100 },
  { pattern: /pharmacy|drugstore|nhà thuốc|thuốc/i, category: "Health", priority: 90 },
  { pattern: /doctor|bác sĩ|khám bệnh|health check/i, category: "Health", priority: 80 },
  { pattern: /bảo hiểm|insurance|y tế|health insurance/i, category: "Health", priority: 70 },
  { pattern: /gym|yoga|fitness|thể dục|tập gym/i, category: "Health", priority: 60 },

  // Education
  { pattern: /school|học|education|university|college|đại học/i, category: "Education", priority: 100 },
  { pattern: /course|khóa học|luyện thi|iels|toeic|toefl/i, category: "Education", priority: 90 },
  { pattern: /book|sách|văn phòng phẩm|stationery/i, category: "Education", priority: 80 },
  { pattern: /tuition|học phí|school fee/i, category: "Education", priority: 70 },

  // Housing
  { pattern: /rent|thuê nhà|house rent|tiền nhà/i, category: "Housing", priority: 100 },
  { pattern: /elevator|thang máy|building|chung cư|apartment/i, category: "Housing", priority: 90 },
  { pattern: /clean|dọn dẹp|vệ sinh|household|domestic/i, category: "Housing", priority: 80 },

  // Income
  { pattern: /lương|salary|payroll|payroll/i, category: "Salary", priority: 100 },
  { pattern: /bonus|thưởng|commission|hoa hồng/i, category: "Salary", priority: 95 },
  { pattern: /freelance|freelancer|contract|cộng tác/i, category: "Freelance", priority: 90 },
  { pattern: /refund|hoàn tiền|return money/i, category: "Refund", priority: 85 },
  { pattern: /interest|lãi suất|lãi suất|dividend|cổ tức/i, category: "Investment Income", priority: 80 },
  { pattern: /gift|quà tặng|transfer|chuyển khoản/i, category: "Transfer", priority: 75 },

  // Banking & Finance
  { pattern: /phí|fee|charge|dịch vụ|service fee/i, category: "Bank Charges", priority: 100 },
  { pattern: /atm|withdraw|rút tiền|cash advance/i, category: "Cash Withdrawal", priority: 90 },
  { pattern: /transfer|chuyển khoản|transaction fee/i, category: "Bank Charges", priority: 80 },

  // Travel
  { pattern: /hotel|khách sạn|reservation|booking|airbnb/i, category: "Travel", priority: 100 },
  { pattern: /flight|bay|plane|airline|vé máy bay|vietjet|bamboo|vietnam airline/i, category: "Travel", priority: 95 },
  { pattern: /visa|passport|travel insurance|du lịch|tour/i, category: "Travel", priority: 90 },
];

/**
 * Category mapping to ensure categories exist
 */
const CATEGORY_ALIASES: Record<string, string> = {
  "Transport": "Transport",
  "Food & Drink": "Food & Drink",
  "Shopping": "Shopping",
  "Entertainment": "Entertainment",
  "Bills & Utilities": "Bills & Utilities",
  "Health": "Health",
  "Education": "Education",
  "Housing": "Housing",
  "Salary": "Salary",
  "Freelance": "Freelance",
  "Refund": "Refund",
  "Investment Income": "Investment Income",
  "Transfer": "Transfer",
  "Bank Charges": "Bank Charges",
  "Cash Withdrawal": "Cash Withdrawal",
  "Travel": "Travel",
};

// ============================================================================
// Vector Embedding Functions
// ============================================================================

/**
 * Generate embedding for text using Cloudflare Workers AI
 * Model: @cf/baai/bge-base-en-v1.5
 */
async function generateEmbedding(ai: Ai, text: string): Promise<number[]> {
  const response = await ai.run("@cf/baai/bge-base-en-v1.5", { text });
  const embedding = (response as any).data?.[0] || (response as any).embedding;

  if (!Array.isArray(embedding)) {
    throw new Error("Invalid embedding response from AI model");
  }

  return embedding;
}

/**
 * Get embedding from cache or generate new one
 * Cache TTL: 24 hours
 */
async function getCachedEmbedding(
  cache: KVNamespace,
  ai: Ai,
  text: string,
  prefix: string = "emb"
): Promise<number[]> {
  const cacheKey = `${prefix}:${Buffer.from(text).toString("base64").slice(0, 100)}`;

  try {
    const cached = await cache.get<CachedEmbedding>(cacheKey, "json");
    if (cached && cached.vector) {
      const age = Date.now() - cached.timestamp;
      const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

      if (age < CACHE_TTL) {
        return cached.vector;
      }
    }
  } catch (error) {
    console.warn("Cache read error:", error);
  }

  const embedding = await generateEmbedding(ai, text);

  try {
    await cache.put(
      cacheKey,
      JSON.stringify({ vector: embedding, timestamp: Date.now() }),
      { expirationTtl: 86400 } // 24 hours
    );
  } catch (error) {
    console.warn("Cache write error:", error);
  }

  return embedding;
}

/**
 * Calculate cosine similarity between two vectors
 * Formula: dot(a,b) / (norm(a) * norm(b))
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vector dimensions must match");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);

  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Get user's categories with optional type filter
 */
async function getUserCategories(
  db: D1Database,
  userId: string,
  type?: "INCOME" | "EXPENSE"
): Promise<Array<{ id: string; name: string; type: string }>> {
  let query = `SELECT id, name, type FROM categories WHERE user_id = ?`;
  const params: [string, string | null] = [userId, null];

  if (type) {
    query += ` AND type = ?`;
    params[1] = type;
  }

  query += ` ORDER BY name`;

  const result = await db.prepare(query).bind(...params).all<{ id: string; name: string; type: string }>();

  return result.results || [];
}

/**
 * Generate category suggestions using vector embeddings
 *
 * PRD Specification:
 * "The text description is embedded using @cf/baai/bge-base-en-v1.5.
 * The vector is compared (cosine similarity) against the user's category list
 * to suggest a category."
 *
 * @returns Top 5 matching categories with confidence scores
 */
export async function suggestCategoriesByEmbedding(
  env: Env,
  userId: string,
  merchantName: string | null,
  description: string,
  amount: number
): Promise<CategorySuggestion[]> {
  if (!env.AI || !env.CACHE) {
    console.warn("AI or CACHE binding not available, falling back to pattern matching");
    return [];
  }

  const type = amount >= 0 ? "INCOME" : "EXPENSE";

  const categories = await getUserCategories(env.DB, userId, type);

  if (categories.length === 0) {
    return [];
  }

  const searchText = [merchantName, description].filter(Boolean).join(" ");

  if (!searchText.trim()) {
    return [];
  }

  try {
    const searchEmbedding = await getCachedEmbedding(env.CACHE, env.AI, searchText, "tx");

    const similarities: Array<{
      categoryId: string;
      categoryName: string;
      similarity: number;
    }> = await Promise.all(
      categories.map(async (category) => {
        try {
          const categoryEmbedding = await getCachedEmbedding(
            env.CACHE!,
            env.AI!,
            category.name,
            "cat"
          );

          const similarity = cosineSimilarity(searchEmbedding, categoryEmbedding);

          return {
            categoryId: category.id,
            categoryName: category.name,
            similarity,
          };
        } catch (error) {
          console.warn(`Failed to generate embedding for category ${category.name}:`, error);
          return {
            categoryId: category.id,
            categoryName: category.name,
            similarity: 0,
          };
        }
      })
    );

    const MIN_SIMILARITY_THRESHOLD = 0.3;

    const filtered = similarities.filter((s) => s.similarity >= MIN_SIMILARITY_THRESHOLD);

    filtered.sort((a, b) => b.similarity - a.similarity);

    const top5 = filtered.slice(0, 5);

    const maxSimilarity = top5[0]?.similarity || 1;

    return top5.map((suggestion) => ({
      categoryId: suggestion.categoryId,
      categoryName: suggestion.categoryName,
      confidence: maxSimilarity > 0 ? suggestion.similarity / maxSimilarity : 0,
      similarity: suggestion.similarity,
    }));
  } catch (error) {
    console.error("Vector embedding categorization failed:", error);
    return [];
  }
}

/**
 * Auto-categorize transaction using vector embeddings
 *
 * This function:
 * 1. Gets user's categories
 * 2. Generates embedding for transaction text (merchant + description)
 * 3. Generates embeddings for each category name
 * 4. Calculates cosine similarity
 * 5. Returns best matching category if confidence > threshold
 *
 * @returns Category ID if confident match, null otherwise
 */
export async function autoCategorizeByEmbedding(
  env: Env,
  userId: string,
  merchantName: string | null,
  description: string,
  amount: number
): Promise<string | null> {
  const suggestions = await suggestCategoriesByEmbedding(
    env,
    userId,
    merchantName,
    description,
    amount
  );

  if (suggestions.length === 0) {
    return null;
  }

  const MIN_CONFIDENCE_THRESHOLD = 0.6;

  const bestMatch = suggestions[0];

  if (bestMatch.confidence >= MIN_CONFIDENCE_THRESHOLD) {
    return bestMatch.categoryId;
  }

  return null;
}

// ============================================================================
// Pattern-Based Fallback Functions
// ============================================================================

/**
 * Categorize transaction by pattern matching
 */
export function categorizeByPattern(content: string, amount: number): string | null {
  if (!content || typeof content !== "string") {
    return null;
  }

  const normalizedContent = content.toLowerCase().trim();

  // Check each rule in priority order
  for (const rule of CATEGORIZATION_RULES) {
    if (rule.pattern.test(normalizedContent)) {
      const category = CATEGORY_ALIASES[rule.category];
      if (category) {
        return category;
      }
    }
  }

  // If amount is negative (expense) and no pattern matched, return uncategorized
  // If amount is positive (income), check for income-specific patterns
  if (amount > 0) {
    if (/chuyển khoản|transfer|nap|rút|nạp/i.test(normalizedContent)) {
      return "Transfer";
    }
    if (/lương|salary/i.test(normalizedContent)) {
      return "Salary";
    }
  }

  return null;
}

/**
 * Get or create category by name
 */
async function getOrCreateCategory(
  db: D1Database,
  userId: string,
  categoryName: string,
  type: "INCOME" | "EXPENSE"
): Promise<string | null> {
  // Try to find existing category
  const existing = await db
    .prepare(
      `SELECT id FROM categories
       WHERE user_id = ? AND name = ? AND type = ?
       LIMIT 1`
    )
    .bind(userId, categoryName, type)
    .first<{ id: string }>();

  if (existing) {
    return existing.id;
  }

  // Create new category
  const categoryId = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO categories (id, user_id, name, type)
       VALUES (?, ?, ?, ?)`
    )
    .bind(categoryId, userId, categoryName, type)
    .run();

  return categoryId;
}

/**
 * Auto-categorize transaction based on content and amount
 *
 * Strategy:
 * 1. Try vector embedding approach (PRD specification)
 * 2. Fall back to pattern matching if embeddings fail or unavailable
 * 3. Return null if no confident match
 */
export async function autoCategorizeTransaction(
  db: D1Database,
  userId: string,
  content: string,
  amount: number
): Promise<string | null> {
  return autoCategorizeTransactionWithEnv(
    { DB: db } as Env,
    userId,
    null,
    content,
    amount
  );
}

/**
 * Auto-categorize transaction with full Env context (AI + Cache)
 *
 * This is the primary categorization function that uses vector embeddings
 * as specified in the PRD, with pattern matching as fallback.
 *
 * @param env - Cloudflare environment with AI, CACHE, DB bindings
 * @param userId - User ID
 * @param merchantName - Merchant name from transaction
 * @param description - Transaction description/content
 * @param amount - Transaction amount (positive for income, negative for expense)
 * @returns Category ID if confident match, null otherwise
 */
export async function autoCategorizeTransactionWithEnv(
  env: Env,
  userId: string,
  merchantName: string | null,
  description: string,
  amount: number
): Promise<string | null> {
  // Try vector embedding approach first (PRD specification)
  if (env.AI && env.CACHE) {
    try {
      const categoryId = await autoCategorizeByEmbedding(
        env,
        userId,
        merchantName,
        description,
        amount
      );

      if (categoryId) {
        return categoryId;
      }
    } catch (error) {
      console.warn("Vector embedding categorization failed, falling back to pattern matching:", error);
    }
  }

  // Fallback to pattern-based categorization
  const content = [merchantName, description].filter(Boolean).join(" ");
  const category = categorizeByPattern(content, amount);

  if (!category) {
    return null;
  }

  // Determine if income or expense based on amount
  const type = amount >= 0 ? "INCOME" : "EXPENSE";

  // Get or create category
  const categoryId = await getOrCreateCategory(env.DB, userId, category, type);

  return categoryId;
}

/**
 * Batch categorize transactions
 */
export async function batchCategorizeTransactions(
  db: D1Database,
  transactions: Array<{ id: string; userId: string; content: string; amount: number }>
): Promise<void> {
  for (const tx of transactions) {
    const categoryId = await autoCategorizeTransaction(
      db,
      tx.userId,
      tx.content,
      tx.amount
    );

    if (categoryId) {
      await db
        .prepare(
          `UPDATE transactions
           SET category_id = ?
           WHERE id = ? AND user_id = ?`
        )
        .bind(categoryId, tx.id, tx.userId)
        .run();
    }
  }
}

/**
 * Batch categorize transactions with full Env context
 *
 * Uses vector embeddings for intelligent categorization as specified in PRD.
 *
 * @param env - Cloudflare environment with AI, CACHE, DB bindings
 * @param transactions - Array of transactions to categorize
 */
export async function batchCategorizeTransactionsWithEnv(
  env: Env,
  transactions: Array<{
    id: string;
    userId: string;
    merchantName: string | null;
    description: string;
    amount: number;
  }>
): Promise<void> {
  for (const tx of transactions) {
    const categoryId = await autoCategorizeTransactionWithEnv(
      env,
      tx.userId,
      tx.merchantName,
      tx.description,
      tx.amount
    );

    if (categoryId) {
      await env.DB
        .prepare(
          `UPDATE transactions
           SET category_id = ?
           WHERE id = ? AND user_id = ?`
        )
        .bind(categoryId, tx.id, tx.userId)
        .run();
    }
  }
}

/**
 * Get categorization suggestions for a transaction
 *
 * Returns pattern-based suggestions as a simple string array for backward compatibility.
 * For AI-powered suggestions with confidence scores, use suggestCategoriesByEmbedding().
 */
export function getCategorizationSuggestions(content: string, amount: number): string[] {
  const suggestions: string[] = [];
  const seen = new Set<string>();

  for (const rule of CATEGORIZATION_RULES) {
    if (rule.pattern.test(content.toLowerCase()) && !seen.has(rule.category)) {
      suggestions.push(rule.category);
      seen.add(rule.category);
    }
  }

  return suggestions;
}

/**
 * Add custom categorization rule for a user
 */
export async function addCustomCategorizationRule(
  db: D1Database,
  userId: string,
  pattern: string,
  category: string
): Promise<void> {
  // In a full implementation, this would store user-specific rules in the database
  // For now, we rely on the global rules
}

/**
 * Learn from user's manual categorization
 */
export async function learnFromCategorization(
  db: D1Database,
  userId: string,
  content: string,
  categoryId: string
): Promise<void> {
  // In a full implementation, this would:
  // 1. Extract patterns from the content
  // 2. Store user-specific rules
  // 3. Improve future auto-categorization
}
