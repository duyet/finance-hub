/**
 * Category Suggestion Service using Cloudflare Workers AI embeddings
 * Suggests transaction categories based on merchant name similarity
 */

import type { CloudflareRequest } from "../auth/db.server";
import { getDb } from "../auth/db.server";
import type { CategorySuggestion } from "../types/receipt";

/**
 * Get AI binding from request context
 */
function getAI(request: CloudflareRequest) {
  return request.context?.cloudflare?.env?.AI;
}

/**
 * Generate embedding for text using @cf/baai/bge-base-en-v1.5
 */
export async function generateEmbedding(
  request: CloudflareRequest,
  text: string
): Promise<number[]> {
  const ai = getAI(request);

  if (!ai) {
    throw new Error("AI binding not available");
  }

  try {
    // Use BGE base embedding model
    const response = await ai.run("@cf/baai/bge-base-en-v1.5", {
      text: text.trim(),
    });

    // Response shape varies, try common formats
    const embedding =
      (response as any).embedding ||
      (response as any).data?.[0]?.embedding ||
      (response as any).vector ||
      [];

    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error("Invalid embedding response");
    }

    return embedding;
  } catch (error) {
    console.error("Embedding generation error:", error);
    throw new Error(
      `Failed to generate embedding: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
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

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Get user's categories from database
 */
async function getUserCategories(
  request: CloudflareRequest,
  userId: string
): Promise<Array<{ id: string; name: string; type: string }>> {
  const db = getDb(request);

  const result = await db
    .prepare(
      `SELECT id, name, type FROM categories
       WHERE user_id = ?
       ORDER BY name`
    )
    .bind(userId)
    .all();

  return (result.results as Array<{ id: string; name: string; type: string }>) || [];
}

/**
 * Get category embedding from cache or generate new one
 */
async function getCategoryEmbedding(
  request: CloudflareRequest,
  categoryName: string
): Promise<number[]> {
  // Check KV cache first
  const cache = request.context?.cloudflare?.env?.CACHE;
  const cacheKey = `category_embedding:${categoryName.toLowerCase()}`;

  if (cache) {
    try {
      const cached = await cache.get(cacheKey, "json");
      if (cached && Array.isArray(cached)) {
        return cached as number[];
      }
    } catch (error) {
      console.error("Cache read error:", error);
    }
  }

  // Generate new embedding
  const embedding = await generateEmbedding(request, categoryName);

  // Cache the result (24 hours)
  if (cache) {
    try {
      await cache.put(
        cacheKey,
        JSON.stringify(embedding),
        { expirationTtl: 86400 }
      );
    } catch (error) {
      console.error("Cache write error:", error);
    }
  }

  return embedding;
}

/**
 * Suggest category based on merchant name using embeddings
 */
export async function suggestCategory(
  request: CloudflareRequest,
  merchantName: string,
  userId: string
): Promise<CategorySuggestion[]> {
  try {
    // Get user's categories
    const categories = await getUserCategories(request, userId);

    if (categories.length === 0) {
      return [];
    }

    // Generate embedding for merchant name
    const merchantEmbedding = await generateEmbedding(
      request,
      merchantName
    );

    // Calculate similarity with each category
    const similarities = await Promise.all(
      categories.map(async (category) => {
        try {
          const categoryEmbedding = await getCategoryEmbedding(
            request,
            category.name
          );
          const similarity = cosineSimilarity(merchantEmbedding, categoryEmbedding);

          return {
            categoryId: category.id,
            categoryName: category.name,
            confidence: similarity,
          };
        } catch (error) {
          console.error(`Error processing category ${category.name}:`, error);
          return {
            categoryId: category.id,
            categoryName: category.name,
            confidence: 0,
          };
        }
      })
    );

    // Sort by confidence (similarity) and filter out low matches
    const threshold = 0.3; // Minimum similarity threshold
    const suggestions = similarities
      .filter((s) => s.confidence >= threshold)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Return top 5 matches

    return suggestions;
  } catch (error) {
    console.error("Category suggestion error:", error);
    return [];
  }
}

/**
 * Suggest category based on historical transactions
 * Finds previous transactions with similar merchant names
 */
export async function suggestCategoryFromHistory(
  request: CloudflareRequest,
  merchantName: string,
  userId: string
): Promise<CategorySuggestion | null> {
  const db = getDb(request);

  try {
    // Search for transactions with similar merchant names
    const result = await db
      .prepare(
        `SELECT
          t.merchant_name,
          t.category_id,
          c.name as category_name,
          COUNT(*) as transaction_count
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = ?
          AND t.merchant_name IS NOT NULL
          AND LOWER(t.merchant_name) LIKE LOWER(?)
        GROUP BY t.category_id, c.name
        ORDER BY transaction_count DESC
        LIMIT 1`
      )
      .bind(userId, `%${merchantName}%`)
      .first<{
        category_id: string;
        category_name: string;
        transaction_count: number;
      }>();

    if (!result || !result.category_id) {
      return null;
    }

    return {
      categoryId: result.category_id,
      categoryName: result.category_name,
      confidence: Math.min(result.transaction_count * 0.1, 0.9), // Cap at 0.9
      reason: `Based on ${result.transaction_count} previous transaction(s)`,
    };
  } catch (error) {
    console.error("History-based suggestion error:", error);
    return null;
  }
}

/**
 * Combined category suggestion (uses both methods)
 */
export async function suggestCategoryCombined(
  request: CloudflareRequest,
  merchantName: string,
  userId: string
): Promise<CategorySuggestion[]> {
  const [embeddingSuggestions, historySuggestion] = await Promise.all([
    suggestCategory(request, merchantName, userId),
    suggestCategoryFromHistory(request, merchantName, userId),
  ]);

  // If history has a strong match, boost its confidence
  if (historySuggestion && historySuggestion.confidence >= 0.5) {
    // Check if this category is already in embedding suggestions
    const existingIndex = embeddingSuggestions.findIndex(
      (s) => s.categoryId === historySuggestion!.categoryId
    );

    if (existingIndex >= 0) {
      // Boost confidence for historical match
      embeddingSuggestions[existingIndex].confidence = Math.min(
        embeddingSuggestions[existingIndex].confidence + 0.2,
        1.0
      );
      embeddingSuggestions[existingIndex].reason = historySuggestion.reason;
    } else {
      // Add historical suggestion
      embeddingSuggestions.unshift(historySuggestion);
    }
  }

  return embeddingSuggestions.slice(0, 5);
}

/**
 * Pre-compute and cache embeddings for all user categories
 * Call this periodically (e.g., when user adds a new category)
 */
export async function cacheCategoryEmbeddings(
  request: CloudflareRequest,
  userId: string
): Promise<void> {
  const categories = await getUserCategories(request, userId);

  for (const category of categories) {
    try {
      await getCategoryEmbedding(request, category.name);
    } catch (error) {
      console.error(`Failed to cache embedding for ${category.name}:`, error);
    }
  }
}
