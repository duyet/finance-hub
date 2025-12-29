/**
 * Anomaly Detection Service
 *
 * Identifies unusual spending patterns using statistical analysis
 * Uses Z-score analysis and moving averages for adaptive baseline
 */

import type { D1Database } from "@cloudflare/workers-types";

// ============================================================================
// Types
// ============================================================================

export interface SpendingAnomaly {
  id: string;
  userId: string;
  transactionId: string;
  anomalyDate: string;
  amount: number;
  expectedAmount: number;
  deviationPercent: number;
  zScore: number;
  anomalyScore: number; // 0-100 composite score
  category: string;
  reasons: string[];
  severity: "low" | "medium" | "high" | "critical";
  isReviewed: boolean;
  reviewedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AnomalyInsight {
  totalAnomalies: number;
  unresolvedCount: number;
  totalAnomalousAmount: number;
  averageAnomalyScore: number;
  topAnomalyCategories: { name: string; count: number; amount: number }[];
  recentTrend: "increasing" | "stable" | "decreasing";
  lastAnalysisDate: string;
}

export interface AnomalyDetectionConfig {
  zScoreThreshold: number; // Default: 2.5
  minAmountThreshold: number; // Default: 100000
  lookbackDays: number; // Default: 30
  enabledCategories: string[];
  sensitivity: "low" | "medium" | "high";
}

export interface TransactionAnomaly {
  transactionId: string;
  amount: number;
  expectedAmount: number;
  zScore: number;
  anomalyScore: number;
  category: string;
  date: string;
  reasons: string[];
}

// ============================================================================
// Anomaly Detection
// ============================================================================

/**
 * Detect anomalies in recent transactions
 */
export async function detectSpendingAnomalies(
  db: D1Database,
  userId: string,
  config: Partial<AnomalyDetectionConfig> = {}
): Promise<SpendingAnomaly[]> {
  const {
    zScoreThreshold = 2.5,
    minAmountThreshold = 100000,
    lookbackDays = 30,
    sensitivity = "medium",
  } = config;

  // Get recent transactions for analysis
  const recentTransactions = await getRecentTransactions(db, userId, lookbackDays);

  // Get historical data for baseline calculation
  const historicalData = await getHistoricalSpendingData(db, userId, lookbackDays * 3);

  // Calculate anomalies
  const anomalies: SpendingAnomaly[] = [];

  for (const tx of recentTransactions) {
    const anomaly = await analyzeTransaction(db, tx, historicalData, {
      zScoreThreshold,
      minAmountThreshold,
      sensitivity,
    });

    if (anomaly) {
      // Check if anomaly already exists
      const existing = await db
        .prepare(`SELECT id FROM spending_anomalies WHERE transaction_id = ?`)
        .bind(tx.id)
        .first();

      if (!existing) {
        const newAnomaly: SpendingAnomaly = {
          id: crypto.randomUUID(),
          userId,
          transactionId: tx.id,
          anomalyDate: tx.transaction_date,
          amount: Math.abs(tx.amount),
          expectedAmount: anomaly.expectedAmount,
          deviationPercent: anomaly.deviationPercent,
          zScore: anomaly.zScore,
          anomalyScore: anomaly.anomalyScore,
          category: tx.category_name || "Uncategorized",
          reasons: anomaly.reasons,
          severity: calculateSeverity(anomaly.anomalyScore),
          isReviewed: false,
          reviewedAt: null,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Save to database
        await db
          .prepare(`
            INSERT INTO spending_anomalies (
              id, user_id, transaction_id, anomaly_date, amount,
              expected_amount, deviation_percent, z_score, anomaly_score,
              category, reasons, severity, is_reviewed, reviewed_at,
              notes, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            newAnomaly.id,
            newAnomaly.userId,
            newAnomaly.transactionId,
            newAnomaly.anomalyDate,
            newAnomaly.amount,
            newAnomaly.expectedAmount,
            newAnomaly.deviationPercent,
            newAnomaly.zScore,
            newAnomaly.anomalyScore,
            newAnomaly.category,
            JSON.stringify(newAnomaly.reasons),
            newAnomaly.severity,
            newAnomaly.isReviewed ? 1 : 0,
            newAnomaly.reviewedAt,
            newAnomaly.notes,
            newAnomaly.createdAt,
            newAnomaly.updatedAt
          )
          .run();

        anomalies.push(newAnomaly);
      }
    }
  }

  return anomalies;
}

/**
 * Analyze a single transaction for anomaly status
 */
async function analyzeTransaction(
  db: D1Database,
  tx: any,
  historicalData: Map<string, { amounts: number[]; mean: number; stdDev: number }>,
  config: {
    zScoreThreshold: number;
    minAmountThreshold: number;
    sensitivity: string;
  }
): Promise<TransactionAnomaly | null> {
  const amount = Math.abs(tx.amount);

  // Skip small transactions
  if (amount < config.minAmountThreshold) {
    return null;
  }

  const category = tx.category_name || "Uncategorized";
  const categoryData = historicalData.get(category);

  if (!categoryData || categoryData.amounts.length < 5) {
    // Not enough data for this category
    return null;
  }

  const { mean, stdDev } = categoryData;

  // Calculate Z-score
  const zScore = stdDev > 0 ? (amount - mean) / stdDev : 0;

  // Skip if within normal range
  if (Math.abs(zScore) < config.zScoreThreshold) {
    return null;
  }

  // Calculate expected amount (mean with seasonality adjustment)
  const expectedAmount = mean;

  // Calculate anomaly score (0-100)
  const rawScore = Math.min(100, Math.abs(zScore) * 20);
  const anomalyScore = adjustForSensitivity(rawScore, config.sensitivity);

  // Generate reasons
  const reasons: string[] = [];

  if (Math.abs(zScore) >= 3) {
    reasons.push(`Amount is ${zScore > 0 ? "significantly higher" : "significantly lower"} than normal (${Math.abs(zScore).toFixed(1)}σ)`);
  }

  if (Math.abs(zScore) >= 4) {
    reasons.push("Extreme deviation - very unusual for this category");
  }

  if (amount > mean * 2) {
    reasons.push(`Amount is more than 2x the average (${category})`);
  }

  if (amount > mean * 3) {
    reasons.push(`Amount is more than 3x the average (${category})`);
  }

  const deviationPercent = mean > 0 ? ((amount - mean) / mean) * 100 : 0;

  if (Math.abs(deviationPercent) > 100) {
    reasons.push(`Deviation from average: ${deviationPercent > 0 ? "+" : ""}${deviationPercent.toFixed(0)}%`);
  }

  // Add temporal patterns
  const transactionDay = new Date(tx.transaction_date).getDay();
  const isWeekend = transactionDay === 0 || transactionDay === 6;

  if (isWeekend && category === "Dining") {
    reasons.push("Weekend dining expense");
  }

  if (transactionDay === 5 && category === "Entertainment") {
    reasons.push("Friday entertainment spending");
  }

  return {
    transactionId: tx.id,
    amount,
    expectedAmount,
    zScore,
    anomalyScore,
    category,
    date: tx.transaction_date,
    reasons,
  };
}

/**
 * Get recent transactions for analysis
 */
async function getRecentTransactions(
  db: D1Database,
  userId: string,
  days: number
): Promise<any[]> {
  const result = await db
    .prepare(`
      SELECT
        t.id,
        t.transaction_date,
        t.amount,
        t.transaction_type,
        COALESCE(c.name, 'Uncategorized') as category_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
        AND t.transaction_type IN ('expense', 'refund')
        AND t.is_reconciled = 1
        AND date(t.transaction_date) >= date('now', '-' || ? || ' days')
      ORDER BY t.transaction_date DESC
    `)
    .bind(userId, days)
    .all();

  return result.results as any[];
}

/**
 * Get historical spending data for baseline calculation
 */
async function getHistoricalSpendingData(
  db: D1Database,
  userId: string,
  days: number
): Promise<Map<string, { amounts: number[]; mean: number; stdDev: number }>> {
  const result = await db
    .prepare(`
      SELECT
        COALESCE(c.name, 'Uncategorized') as category_name,
        ABS(t.amount) as amount
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
        AND t.transaction_type IN ('expense', 'refund')
        AND t.is_reconciled = 1
        AND date(t.transaction_date) >= date('now', '-' || ? || ' days')
        AND date(t.transaction_date) < date('now', '-' || ? || ' days')
      ORDER BY t.transaction_date DESC
    `)
    .bind(userId, days, Math.floor(days / 3))
    .all();

  const transactions = result.results as any[];

  // Group by category
  const categoryMap = new Map<string, number[]>();

  for (const tx of transactions) {
    const category = tx.category_name;
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(tx.amount);
  }

  // Calculate statistics
  const stats = new Map();

  for (const [category, amounts] of categoryMap.entries()) {
    if (amounts.length < 3) continue; // Skip categories with insufficient data

    const mean = calculateMean(amounts);
    const stdDev = calculateStdDev(amounts, mean);

    stats.set(category, { amounts, mean, stdDev });
  }

  return stats;
}

/**
 * Calculate mean (average)
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length);
}

/**
 * Adjust anomaly score based on sensitivity
 */
function adjustForSensitivity(score: number, sensitivity: string): number {
  const multipliers: Record<string, number> = {
    low: 0.7,
    medium: 1.0,
    high: 1.3,
  };
  return Math.min(100, score * (multipliers[sensitivity] || 1.0));
}

/**
 * Calculate severity from anomaly score
 */
function calculateSeverity(anomalyScore: number): "low" | "medium" | "high" | "critical" {
  if (anomalyScore >= 80) return "critical";
  if (anomalyScore >= 60) return "high";
  if (anomalyScore >= 40) return "medium";
  return "low";
}

// ============================================================================
// Anomaly Management
// ============================================================================

/**
 * Get all anomalies for a user
 */
export async function getSpendingAnomalies(
  db: D1Database,
  userId: string,
  includeReviewed: boolean = false
): Promise<SpendingAnomaly[]> {
  let query = `
    SELECT
      id, user_id, transaction_id, anomaly_date, amount,
      expected_amount, deviation_percent, z_score, anomaly_score,
      category, reasons, severity, is_reviewed, reviewed_at,
      notes, created_at, updated_at
    FROM spending_anomalies
    WHERE user_id = ?
  `;

  if (!includeReviewed) {
    query += ` AND is_reviewed = 0`;
  }

  query += ` ORDER BY anomaly_date DESC`;

  const result = await db.prepare(query).bind(userId).all();

  return (result.results as any[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    transactionId: row.transaction_id,
    anomalyDate: row.anomaly_date,
    amount: row.amount,
    expectedAmount: row.expected_amount,
    deviationPercent: row.deviation_percent,
    zScore: row.z_score,
    anomalyScore: row.anomaly_score,
    category: row.category,
    reasons: JSON.parse(row.reasons),
    severity: row.severity,
    isReviewed: Boolean(row.is_reviewed),
    reviewedAt: row.reviewed_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Get anomaly insights summary
 */
export async function getAnomalyInsights(
  db: D1Database,
  userId: string
): Promise<AnomalyInsight> {
  const result = await db
    .prepare(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN is_reviewed = 0 THEN 1 END) as unresolved,
        COALESCE(SUM(amount), 0) as total_amount,
        COALESCE(AVG(anomaly_score), 0) as avg_score,
        MAX(created_at) as last_analysis
      FROM spending_anomalies
      WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
    `)
    .bind(userId)
    .first();

  const row = result as any;
  const totalAnomalies = row.total || 0;
  const unresolvedCount = row.unresolved || 0;
  const totalAnomalousAmount = row.total_amount || 0;
  const averageAnomalyScore = row.avg_score || 0;
  const lastAnalysisDate = row.last_analysis || new Date().toISOString();

  // Get top anomaly categories
  const categoryResult = await db
    .prepare(`
      SELECT
        category,
        COUNT(*) as count,
        COALESCE(SUM(amount), 0) as amount
      FROM spending_anomalies
      WHERE user_id = ?
        AND created_at >= datetime('now', '-30 days')
      GROUP BY category
      ORDER BY count DESC
      LIMIT 5
    `)
    .bind(userId)
    .all();

  const topAnomalyCategories = (categoryResult.results as any[]).map((r) => ({
    name: r.category,
    count: r.count,
    amount: r.amount,
  }));

  // Calculate trend (compare recent 7 days to previous 7 days)
  const trendResult = await db
    .prepare(`
      WITH weekly_counts AS (
        SELECT
          strftime('%Y-%W', created_at) as week,
          COUNT(*) as count
        FROM spending_anomalies
        WHERE user_id = ? AND created_at >= datetime('now', '-14 days')
        GROUP BY week
      )
      SELECT
        (SELECT count FROM weekly_counts ORDER BY week DESC LIMIT 1) as recent,
        (SELECT count FROM weekly_counts ORDER BY week DESC LIMIT 1 OFFSET 1) as previous
    `)
    .bind(userId)
    .first();

  const trendRow = trendResult as any;
  const recent = trendRow.recent || 0;
  const previous = trendRow.previous || 0;

  let recentTrend: "increasing" | "stable" | "decreasing" = "stable";
  if (recent > previous * 1.2) {
    recentTrend = "increasing";
  } else if (recent < previous * 0.8) {
    recentTrend = "decreasing";
  }

  return {
    totalAnomalies,
    unresolvedCount,
    totalAnomalousAmount,
    averageAnomalyScore,
    topAnomalyCategories,
    recentTrend,
    lastAnalysisDate,
  };
}

/**
 * Mark anomaly as reviewed
 */
export async function markAnomalyReviewed(
  db: D1Database,
  anomalyId: string,
  notes?: string
): Promise<void> {
  await db
    .prepare(`
      UPDATE spending_anomalies
      SET is_reviewed = 1, reviewed_at = datetime('now'), notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `)
    .bind(notes || null, anomalyId)
    .run();
}

/**
 * Delete old anomalies (cleanup)
 */
export async function cleanupOldAnomalies(
  db: D1Database,
  userId: string,
  daysToKeep: number = 90
): Promise<number> {
  const result = await db
    .prepare(`
      DELETE FROM spending_anomalies
      WHERE user_id = ? AND is_reviewed = 1 AND created_at < datetime('now', '-' || ? || ' days')
    `)
    .bind(userId, daysToKeep)
    .run();

  return result.meta.changes || 0;
}
