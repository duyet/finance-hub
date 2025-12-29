/**
 * Smart Categorization Service
 *
 * Automatically categorizes transactions using pattern matching
 * and learned rules from user's historical categorizations
 */

import type { D1Database } from "@cloudflare/workers-types";

// ============================================================================
// Types
// ============================================================================

export interface CategoryPattern {
  id: string;
  userId: string;
  pattern: string;
  patternType: "contains" | "equals" | "regex" | "fuzzy";
  categoryId: string;
  confidence: number; // 0-100
  matchCount: number;
  lastMatched: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CategorizationPrediction {
  transactionId: string;
  suggestedCategoryId: string | null;
  confidence: number;
  reason: string;
  matchedPattern: string | null;
}

export interface CategorizationStats {
  totalTransactions: number;
  categorizedCount: number;
  autoCategorizedCount: number;
  autoCategorizationRate: number;
  topUncategorized: { description: string; amount: number; count: number }[];
  accuracy: number;
}

// ============================================================================
// Pattern Management
// ============================================================================

/**
 * Suggest category for a transaction using pattern matching
 */
export async function suggestCategory(
  db: D1Database,
  userId: string,
  transactionId: string,
  learnFromHistory: boolean = true
): Promise<CategorizationPrediction> {
  // Get transaction details
  const transaction = await db
    .prepare(`
      SELECT id, description, amount, transaction_type, category_id
      FROM transactions
      WHERE id = ? AND user_id = ?
    `)
    .bind(transactionId, userId)
    .first();

  if (!transaction) {
    return {
      transactionId,
      suggestedCategoryId: null,
      confidence: 0,
      reason: "Transaction not found",
      matchedPattern: null,
    };
  }

  const tx = transaction as any;

  // Skip if already categorized
  if (tx.category_id) {
    return {
      transactionId,
      suggestedCategoryId: tx.category_id,
      confidence: 100,
      reason: "Already categorized",
      matchedPattern: null,
    };
  }

  // Skip if not an expense
  if (tx.transaction_type.toLowerCase() !== "expense") {
    return {
      transactionId,
      suggestedCategoryId: null,
      confidence: 0,
      reason: "Not an expense transaction",
      matchedPattern: null,
    };
  }

  const description = (tx.description || "").toLowerCase();
  const amount = Math.abs(tx.amount);

  // Get user's patterns
  const patternsResult = await db
    .prepare(`
      SELECT pattern, pattern_type, category_id, confidence
      FROM category_patterns
      WHERE user_id = ? AND is_active = 1
      ORDER BY confidence DESC, match_count DESC
    `)
    .bind(userId)
    .all();

  const userPatterns = patternsResult.results as any[];

  // Try to match against patterns
  for (const pattern of userPatterns) {
    const match = matchPattern(description, pattern.pattern, pattern.pattern_type);

    if (match) {
      // Update match count
      await db
        .prepare(`
          UPDATE category_patterns
          SET match_count = match_count + 1, last_matched = datetime('now'), updated_at = datetime('now')
          WHERE user_id = ? AND pattern = ?
        `)
        .bind(userId, pattern.pattern)
        .run();

      return {
        transactionId,
        suggestedCategoryId: pattern.category_id,
        confidence: pattern.confidence,
        reason: `Matched pattern: "${pattern.pattern}"`,
        matchedPattern: pattern.pattern,
      };
    }
  }

  // Learn from history if enabled
  if (learnFromHistory) {
    const historicalSuggestion = await suggestFromHistory(db, userId, description, amount);

    if (historicalSuggestion.confidence >= 80) {
      // Create new pattern from this learning
      await createLearnedPattern(
        db,
        userId,
        description,
        historicalSuggestion.suggestedCategoryId!,
        historicalSuggestion.confidence
      );

      return historicalSuggestion;
    }
  }

  // Apply heuristic rules
  const heuristicSuggestion = applyHeuristics(db, userId, description, amount);

  return heuristicSuggestion;
}

/**
 * Match a description against a pattern
 */
function matchPattern(
  description: string,
  pattern: string,
  patternType: string
): boolean {
  switch (patternType) {
    case "contains":
      return description.toLowerCase().includes(pattern.toLowerCase());

    case "equals":
      return description.toLowerCase() === pattern.toLowerCase();

    case "regex":
      try {
        const regex = new RegExp(pattern, "i");
        return regex.test(description);
      } catch {
        return false;
      }

    case "fuzzy":
      return fuzzyMatch(description, pattern.toLowerCase(), 0.7);

    default:
      return false;
  }
}

/**
 * Fuzzy string matching using Levenshtein distance
 */
function fuzzyMatch(str: string, pattern: string, threshold: number): boolean {
  const distance = levenshteinDistance(str.toLowerCase(), pattern);
  const maxLen = Math.max(str.length, pattern.length);
  const similarity = 1 - distance / maxLen;
  return similarity >= threshold;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

/**
 * Suggest category based on historical similar transactions
 */
async function suggestFromHistory(
  db: D1Database,
  userId: string,
  description: string,
  amount: number
): Promise<CategorizationPrediction> {
  // Find similar transactions by description
  const result = await db
    .prepare(`
      SELECT
        c.id as category_id,
        c.name as category_name,
        COUNT(*) as match_count,
        AVG(t.amount) as avg_amount
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
        AND t.category_id IS NOT NULL
        AND t.description IS NOT NULL
        AND LOWER(t.description) LIKE '%' || SUBSTR(?, 1, 20) || '%'
      GROUP BY c.id, c.name
      HAVING COUNT(*) >= 3
      ORDER BY match_count DESC
      LIMIT 3
    `)
    .bind(userId, description)
    .first();

  if (!result) {
    return {
      transactionId: "",
      suggestedCategoryId: null,
      confidence: 0,
      reason: "No similar historical transactions found",
      matchedPattern: null,
    };
  }

  const row = result as any;
  const confidence = Math.min(95, 60 + row.match_count * 10);

  return {
    transactionId: "",
    suggestedCategoryId: row.category_id,
    confidence,
    reason: `Based on ${row.match_count} similar transactions`,
    matchedPattern: "historical",
  };
}

/**
 * Apply heuristic categorization rules
 */
async function applyHeuristics(
  db: D1Database,
  userId: string,
  description: string,
  amount: number
): Promise<CategorizationPrediction> {
  const desc = description.toLowerCase();

  // Find category by keyword matching
  const keywordsResult = await db
    .prepare(`
      SELECT id, name, keywords
      FROM categories
      WHERE user_id = ? AND keywords IS NOT NULL
    `)
    .bind(userId)
    .all();

  const categories = keywordsResult.results as any[];

  for (const category of categories) {
    try {
      const keywords = JSON.parse(category.keywords);
      for (const keyword of keywords) {
        if (desc.includes(keyword.toLowerCase())) {
          return {
            transactionId: "",
            suggestedCategoryId: category.id,
            confidence: 70,
            reason: `Keyword match: "${keyword}"`,
            matchedPattern: keyword,
          };
        }
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  // Amount-based heuristics
  // Round amounts like 100000, 500000 might be ATM withdrawals
  if (amount % 100000 === 0 && amount >= 100000 && amount <= 2000000) {
    // Find "Cash" or "ATM" category
    const cashResult = await db
      .prepare(`
        SELECT id FROM categories
        WHERE user_id = ? AND (LOWER(name) LIKE '%cash%' OR LOWER(name) LIKE '%atm%')
        LIMIT 1
      `)
      .bind(userId)
      .first();

    if (cashResult) {
      return {
        transactionId: "",
        suggestedCategoryId: (cashResult as any).id,
        confidence: 60,
        reason: "Round amount suggests cash withdrawal",
        matchedPattern: "amount:round",
      };
    }
  }

  // Transfer-like amounts (exact thousands, millions)
  if (amount >= 1000000 && desc.includes("transfer")) {
    const transferResult = await db
      .prepare(`
        SELECT id FROM categories
        WHERE user_id = ? AND LOWER(name) LIKE '%transfer%'
        LIMIT 1
      `)
      .bind(userId)
      .first();

    if (transferResult) {
      return {
        transactionId: "",
        suggestedCategoryId: (transferResult as any).id,
        confidence: 75,
        reason: "Transfer transaction detected",
        matchedPattern: "keyword:transfer",
      };
    }
  }

  return {
    transactionId: "",
    suggestedCategoryId: null,
    confidence: 0,
    reason: "No matching pattern found",
    matchedPattern: null,
  };
}

/**
 * Create a learned pattern from historical data
 */
async function createLearnedPattern(
  db: D1Database,
  userId: string,
  description: string,
  categoryId: string,
  confidence: number
): Promise<void> {
  // Extract first meaningful word as pattern
  const words = description
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (words.length === 0) return;

  const pattern = words[0];

  // Check if pattern already exists
  const existing = await db
    .prepare(`SELECT id FROM category_patterns WHERE user_id = ? AND pattern = ?`)
    .bind(userId, pattern)
    .first();

  if (!existing) {
    await db
      .prepare(`
        INSERT INTO category_patterns (
          id, user_id, pattern, pattern_type, category_id, confidence,
          match_count, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, 'contains', ?, ?, 1, 1, datetime('now'), datetime('now'))
      `)
      .bind(crypto.randomUUID(), userId, pattern, categoryId, confidence)
      .run();
  }
}

/**
 * Auto-categorize uncategorized transactions
 */
export async function autoCategorizeTransactions(
  db: D1Database,
  userId: string,
  confidenceThreshold: number = 80
): Promise<number> {
  // Get uncategorized transactions
  const transactionsResult = await db
    .prepare(`
      SELECT id, description, amount, transaction_type
      FROM transactions
      WHERE user_id = ?
        AND category_id IS NULL
        AND transaction_type = 'expense'
        AND is_reconciled = 1
      ORDER BY transaction_date DESC
      LIMIT 100
    `)
    .bind(userId)
    .all();

  const transactions = transactionsResult.results as any[];
  let categorizedCount = 0;

  for (const tx of transactions) {
    const prediction = await suggestCategory(db, userId, tx.id, true);

    if (
      prediction.suggestedCategoryId &&
      prediction.confidence >= confidenceThreshold
    ) {
      // Apply categorization
      await db
        .prepare(`UPDATE transactions SET category_id = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(prediction.suggestedCategoryId, tx.id)
        .run();

      categorizedCount++;
    }
  }

  return categorizedCount;
}

/**
 * Create a manual categorization pattern
 */
export async function createCategoryPattern(
  db: D1Database,
  userId: string,
  pattern: string,
  patternType: "contains" | "equals" | "regex" | "fuzzy",
  categoryId: string,
  confidence: number = 90
): Promise<void> {
  await db
    .prepare(`
      INSERT INTO category_patterns (
        id, user_id, pattern, pattern_type, category_id, confidence,
        match_count, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 1, datetime('now'), datetime('now'))
    `)
    .bind(crypto.randomUUID(), userId, pattern, patternType, categoryId, confidence)
    .run();
}

/**
 * Get categorization statistics
 */
export async function getCategorizationStats(
  db: D1Database,
  userId: string
): Promise<CategorizationStats> {
  // Overall stats
  const statsResult = await db
    .prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(category_id) as categorized,
        COALESCE(SUM(CASE WHEN auto_categorized = 1 THEN 1 ELSE 0 END), 0) as auto_categorized
      FROM transactions
      WHERE user_id = ? AND transaction_type = 'expense'
    `)
    .bind(userId)
    .first();

  const stats = statsResult as any;
  const totalTransactions = stats.total || 0;
  const categorizedCount = stats.categorized || 0;
  const autoCategorizedCount = stats.auto_categorized || 0;

  // Top uncategorized transactions
  const uncategorizedResult = await db
    .prepare(`
      SELECT
        SUBSTR(description, 1, 50) as description,
        amount,
        COUNT(*) as count
      FROM transactions
      WHERE user_id = ?
        AND category_id IS NULL
        AND transaction_type = 'expense'
      GROUP BY SUBSTR(description, 1, 50), amount
      ORDER BY count DESC
      LIMIT 10
    `)
    .bind(userId)
    .all();

  const topUncategorized = (uncategorizedResult.results as any[]).map((row) => ({
    description: row.description,
    amount: row.amount,
    count: row.count,
  }));

  // Calculate accuracy (based on user corrections)
  const accuracyResult = await db
    .prepare(`
      SELECT
        CAST(COUNT(CASE WHEN auto_categorized = 1 AND category_id IS NOT NULL THEN 1 END) AS FLOAT) /
        NULLIF(CAST(COUNT(CASE WHEN auto_categorized = 1 THEN 1 END) AS FLOAT), 0) as accuracy
      FROM transactions
      WHERE user_id = ? AND transaction_type = 'expense'
    `)
    .bind(userId)
    .first();

  const accuracyRow = accuracyResult as any;
  const accuracy = (accuracyRow.accuracy || 0) * 100;

  return {
    totalTransactions,
    categorizedCount,
    autoCategorizedCount,
    autoCategorizationRate: totalTransactions > 0 ? (autoCategorizedCount / totalTransactions) * 100 : 0,
    topUncategorized,
    accuracy,
  };
}

/**
 * Get user's category patterns
 */
export async function getCategoryPatterns(
  db: D1Database,
  userId: string
): Promise<CategoryPattern[]> {
  const result = await db
    .prepare(`
      SELECT
        id, user_id, pattern, pattern_type, category_id, confidence,
        match_count, last_matched, is_active, created_at, updated_at
      FROM category_patterns
      WHERE user_id = ?
      ORDER BY confidence DESC, match_count DESC
    `)
    .bind(userId)
    .all();

  return (result.results as any[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    pattern: row.pattern,
    patternType: row.pattern_type,
    categoryId: row.category_id,
    confidence: row.confidence,
    matchCount: row.match_count,
    lastMatched: row.last_matched,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Delete a category pattern
 */
export async function deleteCategoryPattern(
  db: D1Database,
  userId: string,
  patternId: string
): Promise<void> {
  await db
    .prepare(`DELETE FROM category_patterns WHERE id = ? AND user_id = ?`)
    .bind(patternId, userId)
    .run();
}

/**
 * Update pattern activity
 */
export async function togglePatternActivity(
  db: D1Database,
  userId: string,
  patternId: string,
  isActive: boolean
): Promise<void> {
  await db
    .prepare(`
      UPDATE category_patterns
      SET is_active = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `)
    .bind(isActive ? 1 : 0, patternId, userId)
    .run();
}
