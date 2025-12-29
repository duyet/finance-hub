/**
 * Correlations Analysis Service
 *
 * Analyzes relationships between spending patterns, timing, and categories
 * using statistical correlation methods
 */

import type { D1Database } from "@cloudflare/workers-types";

// ============================================================================
// Types
// ============================================================================

export interface CategoryCorrelation {
  category1: string;
  category2: string;
  correlation: number; // -1 to 1
  significance: number; // p-value equivalent 0-1
  sampleSize: number;
}

export interface TimingPattern {
  period: "day_of_week" | "month" | "season";
  periodIndex: number; // 0-6 for day, 1-12 for month, 0-3 for season
  amount: number;
  transactionCount: number;
  deviationFromMean: number; // percentage
}

export interface CorrelationInsights {
  categoryCorrelations: CategoryCorrelation[];
  timingPatterns: {
    dayOfWeek: TimingPattern[];
    monthly: TimingPattern[];
    seasonal: TimingPattern[];
  };
  incomeSpendingCorrelation: {
    correlation: number;
    trend: "increasing" | "decreasing" | "stable";
  };
  topInsights: string[];
}

// ============================================================================
// Correlation Analysis
// ============================================================================

/**
 * Calculate Pearson correlation coefficient between two variables
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let sumSqX = 0;
  let sumSqY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    numerator += dx * dy;
    sumSqX += dx * dx;
    sumSqY += dy * dy;
  }

  const denominator = Math.sqrt(sumSqX) * Math.sqrt(sumSqY);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculate significance (approximate p-value)
 */
function calculateSignificance(correlation: number, sampleSize: number): number {
  if (sampleSize < 3) return 1;

  const t = Math.abs(correlation) * Math.sqrt((sampleSize - 2) / (1 - correlation * correlation));
  // Approximate p-value from t-distribution
  return Math.max(0, 1 - t / Math.sqrt(sampleSize));
}

/**
 * Analyze correlations between spending categories
 */
export async function analyzeCategoryCorrelations(
  db: D1Database,
  userId: string,
  months: number = 6
): Promise<CategoryCorrelation[]> {
  // Get monthly spending by category
  const result = await db
    .prepare(`
      SELECT
        c.name as category,
        strftime('%Y-%m', t.transaction_date) as month,
        SUM(ABS(t.amount)) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
        AND t.transaction_type = 'expense'
        AND t.transaction_date >= date('now', '-${months} months')
        AND t.category_id IS NOT NULL
      GROUP BY c.name, month
      ORDER BY month, c.name
    `)
    .bind(userId)
    .all();

  const rows = result.results as any[];

  // Build category → monthly amounts map
  const categoryData = new Map<string, number[]>();
  const monthsSet = new Set<string>();

  for (const row of rows) {
    if (!categoryData.has(row.category)) {
      categoryData.set(row.category, []);
    }
    categoryData.get(row.category)!.push(row.total);
    monthsSet.add(row.month);
  }

  const categories = Array.from(categoryData.keys());
  const correlations: CategoryCorrelation[] = [];

  // Calculate pairwise correlations
  for (let i = 0; i < categories.length; i++) {
    for (let j = i + 1; j < categories.length; j++) {
      const cat1 = categories[i];
      const cat2 = categories[j];
      const data1 = categoryData.get(cat1)!;
      const data2 = categoryData.get(cat2)!;

      if (data1.length >= 3 && data2.length >= 3) {
        const correlation = pearsonCorrelation(data1, data2);
        const significance = calculateSignificance(correlation, Math.min(data1.length, data2.length));

        // Only include significant correlations (|r| > 0.5 and significance < 0.3)
        if (Math.abs(correlation) > 0.5 && significance < 0.3) {
          correlations.push({
            category1: cat1,
            category2: cat2,
            correlation,
            significance,
            sampleSize: Math.min(data1.length, data2.length),
          });
        }
      }
    }
  }

  // Sort by absolute correlation strength
  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

/**
 * Analyze timing patterns in spending
 */
export async function analyzeTimingPatterns(
  db: D1Database,
  userId: string,
  months: number = 6
): Promise<{
  dayOfWeek: TimingPattern[];
  monthly: TimingPattern[];
  seasonal: TimingPattern[];
}> {
  const result = await db
    .prepare(`
      SELECT
        CAST(strftime('%w', t.transaction_date) AS INTEGER) as day_of_week,
        CAST(strftime('%m', t.transaction_date) AS INTEGER) as month,
        ABS(t.amount) as amount
      FROM transactions t
      WHERE t.user_id = ?
        AND t.transaction_type = 'expense'
        AND t.transaction_date >= date('now', '-${months} months')
        AND t.category_id IS NOT NULL
    `)
    .bind(userId)
    .all();

  const rows = result.results as any[];

  // Day of week patterns
  const dayOfWeekData = Array(7).fill(null).map(() => ({ amount: 0, count: 0 }));
  rows.forEach((row) => {
    dayOfWeekData[row.day_of_week].amount += row.amount;
    dayOfWeekData[row.day_of_week].count += 1;
  });

  const avgDayAmount = dayOfWeekData.reduce((sum, d) => sum + d.amount, 0) / 7;

  const dayOfWeekPatterns: TimingPattern[] = dayOfWeekData.map((data, index) => ({
    period: "day_of_week" as const,
    periodIndex: index,
    amount: data.amount,
    transactionCount: data.count,
    deviationFromMean: avgDayAmount > 0 ? ((data.amount - avgDayAmount) / avgDayAmount) * 100 : 0,
  }));

  // Monthly patterns
  const monthData: Map<number, { amount: number; count: number }> = new Map();
  rows.forEach((row) => {
    if (!monthData.has(row.month)) {
      monthData.set(row.month, { amount: 0, count: 0 });
    }
    const data = monthData.get(row.month)!;
    data.amount += row.amount;
    data.count += 1;
  });

  const avgMonthAmount = Array.from(monthData.values()).reduce((sum, d) => sum + d.amount, 0) / monthData.size;

  const monthlyPatterns: TimingPattern[] = Array.from(monthData.entries()).map(([month, data]) => ({
    period: "month",
    periodIndex: month,
    amount: data.amount,
    transactionCount: data.count,
    deviationFromMean: avgMonthAmount > 0 ? ((data.amount - avgMonthAmount) / avgMonthAmount) * 100 : 0,
  })).sort((a, b) => a.periodIndex - b.periodIndex);

  // Seasonal patterns (Winter: Dec-Feb, Spring: Mar-May, Summer: Jun-Aug, Fall: Sep-Nov)
  const seasonData = Array(4).fill(null).map(() => ({ amount: 0, count: 0 }));
  rows.forEach((row) => {
    const season = Math.floor((row.month - 3 + 12) % 12 / 3);
    seasonData[season].amount += row.amount;
    seasonData[season].count += 1;
  });

  const avgSeasonAmount = seasonData.reduce((sum, d) => sum + d.amount, 0) / 4;

  const seasonalPatterns: TimingPattern[] = seasonData.map((data, index) => ({
    period: "season",
    periodIndex: index,
    amount: data.amount,
    transactionCount: data.count,
    deviationFromMean: avgSeasonAmount > 0 ? ((data.amount - avgSeasonAmount) / avgSeasonAmount) * 100 : 0,
  }));

  return {
    dayOfWeek: dayOfWeekPatterns,
    monthly: monthlyPatterns,
    seasonal: seasonalPatterns,
  };
}

/**
 * Analyze income vs spending correlation
 */
export async function analyzeIncomeSpendingCorrelation(
  db: D1Database,
  userId: string,
  months: number = 6
): Promise<{ correlation: number; trend: "increasing" | "decreasing" | "stable" }> {
  const result = await db
    .prepare(`
      SELECT
        strftime('%Y-%m', t.transaction_date) as month,
        SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE 0 END) as income,
        SUM(CASE WHEN t.transaction_type = 'expense' THEN ABS(t.amount) ELSE 0 END) as spending
      FROM transactions t
      WHERE t.user_id = ?
        AND t.transaction_date >= date('now', '-${months} months')
      GROUP BY month
      ORDER BY month
    `)
    .bind(userId)
    .all();

  const rows = result.results as any[];

  if (rows.length < 3) {
    return { correlation: 0, trend: "stable" };
  }

  const income = rows.map((r) => r.income || 0);
  const spending = rows.map((r) => r.spending || 0);

  const correlation = pearsonCorrelation(income, spending);

  // Determine trend based on spending trajectory
  const firstHalf = spending.slice(0, Math.floor(spending.length / 2));
  const secondHalf = spending.slice(Math.floor(spending.length / 2));

  const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  const changePercent = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst) * 100 : 0;

  let trend: "increasing" | "decreasing" | "stable";
  if (changePercent > 10) {
    trend = "increasing";
  } else if (changePercent < -10) {
    trend = "decreasing";
  } else {
    trend = "stable";
  }

  return { correlation, trend };
}

/**
 * Generate correlation insights
 */
export async function getCorrelationInsights(
  db: D1Database,
  userId: string,
  months: number = 6
): Promise<CorrelationInsights> {
  const [categoryCorrelations, timingPatterns, incomeSpendingCorrelation] = await Promise.all([
    analyzeCategoryCorrelations(db, userId, months),
    analyzeTimingPatterns(db, userId, months),
    analyzeIncomeSpendingCorrelation(db, userId, months),
  ]);

  // Generate top insights
  const topInsights: string[] = [];

  // Strong positive correlations (categories that move together)
  const strongPositive = categoryCorrelations
    .filter((c) => c.correlation > 0.7)
    .slice(0, 3);

  if (strongPositive.length > 0) {
    strongPositive.forEach((c) => {
      topInsights.push(
        `"${c.category1}" and "${c.category2}" spending strongly correlated (${(c.correlation * 100).toFixed(0)}%) - consider bundling or reviewing together`
      );
    });
  }

  // Strong negative correlations (substitution effect)
  const strongNegative = categoryCorrelations
    .filter((c) => c.correlation < -0.7)
    .slice(0, 2);

  if (strongNegative.length > 0) {
    strongNegative.forEach((c) => {
      topInsights.push(
        `"${c.category1}" and "${c.category2}" show substitution patterns - when one increases, the other decreases`
      );
    });
  }

  // Peak spending day
  const peakDay = timingPatterns.dayOfWeek.reduce((max, day) =>
    day.amount > max.amount ? day : max
  );
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  if (peakDay.deviationFromMean > 20) {
    topInsights.push(
      `Peak spending on ${dayNames[peakDay.periodIndex]} (${peakDay.deviationFromMean.toFixed(0)}% above average)`
    );
  }

  // Peak spending month
  const peakMonth = timingPatterns.monthly.reduce((max, month) =>
    month.amount > max.amount ? month : max
  );
  if (peakMonth.deviationFromMean > 30) {
    topInsights.push(
      `Seasonal spike in ${new Date(2000, peakMonth.periodIndex - 1, 1).toLocaleString("default", { month: "long" })} (${peakMonth.deviationFromMean.toFixed(0)}% above average)`
    );
  }

  // Income-spending relationship
  if (incomeSpendingCorrelation.correlation > 0.7) {
    topInsights.push(
      `Strong income-spending coupling (${(incomeSpendingCorrelation.correlation * 100).toFixed(0)}%) - spending rises with income (lifestyle inflation)`
    );
  } else if (incomeSpendingCorrelation.correlation < 0.3) {
    topInsights.push(
      `Good spending discipline - spending not tightly tied to income fluctuations`
    );
  }

  // Trend insight
  if (incomeSpendingCorrelation.trend === "increasing") {
    topInsights.push("Spending trending upward - review budget allocations");
  } else if (incomeSpendingCorrelation.trend === "decreasing") {
    topInsights.push("Spending trending downward - good cost control momentum");
  }

  return {
    categoryCorrelations,
    timingPatterns,
    incomeSpendingCorrelation,
    topInsights,
  };
}
