/**
 * Spending Insights Service
 *
 * Analyzes spending patterns with heatmaps and trends
 * Aggregates transaction data for visualization
 */

import type { D1Database } from "@cloudflare/workers-types";

// ============================================================================
// Types
// ============================================================================

export interface DailySpendingHeatmap {
  date: string;
  amount: number;
  transactionCount: number;
  intensity: number; // 0-9 for heatmap coloring
}

export interface DayOfWeekPattern {
  dayOfWeek: number; // 0=Sunday, 6=Saturday
  dayName: string;
  totalAmount: number;
  averageAmount: number;
  transactionCount: number;
}

export interface MonthlySpendingPattern {
  month: number; // 1-12
  monthName: string;
  totalAmount: number;
  averageAmount: number;
  transactionCount: number;
  yearOverYearChange?: number;
}

export interface CategorySpendingHeatmap {
  categoryId: string;
  categoryName: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  percentageOfTotal: number;
}

export interface HourlySpendingPattern {
  hour: number; // 0-23
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
}

export interface SpendingInsightsSummary {
  totalPeriod: number;
  averageDaily: number;
  highestDay: { date: string; amount: number } | null;
  lowestDay: { date: string; amount: number } | null;
  topCategory: { name: string; amount: number } | null;
  busiestDayOfWeek: { day: string; amount: number } | null;
  peakSpendingHour: number | null;
}

// ============================================================================
// Daily Heatmap
// ============================================================================

/**
 * Generate daily spending heatmap data for a date range
 */
export async function getDailySpendingHeatmap(
  db: D1Database,
  userId: string,
  startDate?: string,
  endDate?: string,
  days: number = 365
): Promise<DailySpendingHeatmap[]> {
  // Default to last 365 days if no dates provided
  const end = endDate ? new Date(endDate) : new Date();
  const start = startDate
    ? new Date(startDate)
    : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

  const result = await db
    .prepare(`
      SELECT
        date(t.transaction_date) as date,
        COALESCE(SUM(
          CASE
            WHEN t.transaction_type = 'expense' THEN ABS(t.amount)
            ELSE 0
          END
        ), 0) as amount,
        COUNT(t.id) as transaction_count
      FROM transactions t
      WHERE t.user_id = ?
        AND t.transaction_type IN ('expense', 'refund')
        AND t.is_reconciled = 1
        AND date(t.transaction_date) >= ?
        AND date(t.transaction_date) <= ?
      GROUP BY date(t.transaction_date)
      ORDER BY date ASC
    `)
    .bind(
      userId,
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0]
    )
    .all();

  const data = (result.results as any[]) || [];

  // Find max amount for intensity calculation
  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  return data.map((row) => {
    const intensity = maxAmount > 0 ? Math.floor((row.amount / maxAmount) * 9) : 0;
    return {
      date: row.date,
      amount: row.amount,
      transactionCount: row.transaction_count,
      intensity: Math.min(9, Math.max(0, intensity)),
    };
  });
}

/**
 * Generate heatmap data with all dates filled (for calendar view)
 */
export async function getCompleteDailyHeatmap(
  db: D1Database,
  userId: string,
  year: number
): Promise<DailySpendingHeatmap[]> {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const heatmapData = await getDailySpendingHeatmap(db, userId, startDate, endDate);

  // Create a map for quick lookup
  const dataMap = new Map(heatmapData.map((d) => [d.date, d]));

  // Fill in missing dates with zero values
  const completeData: DailySpendingHeatmap[] = [];
  const currentDate = new Date(startDate);

  while (currentDate.toISOString().split("T")[0] <= endDate) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const existing = dataMap.get(dateStr);

    completeData.push(
      existing || {
        date: dateStr,
        amount: 0,
        transactionCount: 0,
        intensity: 0,
      }
    );

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return completeData;
}

// ============================================================================
// Day of Week Patterns
// ============================================================================

/**
 * Analyze spending patterns by day of week
 */
export async function getDayOfWeekPatterns(
  db: D1Database,
  userId: string,
  days: number = 90
): Promise<DayOfWeekPattern[]> {
  const result = await db
    .prepare(`
      SELECT
        cast(strftime('%w', t.transaction_date) as integer) as day_of_week,
        CASE cast(strftime('%w', t.transaction_date) as integer)
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day_name,
        COALESCE(SUM(
          CASE
            WHEN t.transaction_type = 'expense' THEN ABS(t.amount)
            ELSE 0
          END
        ), 0) as total_amount,
        COUNT(t.id) as transaction_count
      FROM transactions t
      WHERE t.user_id = ?
        AND t.transaction_type IN ('expense', 'refund')
        AND t.is_reconciled = 1
        AND date(t.transaction_date) >= date('now', '-' || ? || ' days')
      GROUP BY day_of_week
      ORDER BY day_of_week
    `)
    .bind(userId, days)
    .all();

  const data = (result.results as any[]) || [];

  // Calculate average (total / number of weeks in period)
  const weeksCount = Math.ceil(days / 7);

  return data.map((row) => ({
    dayOfWeek: row.day_of_week,
    dayName: row.day_name,
    totalAmount: row.total_amount,
    averageAmount: weeksCount > 0 ? row.total_amount / weeksCount : 0,
    transactionCount: row.transaction_count,
  }));
}

// ============================================================================
// Monthly Patterns
// ============================================================================

/**
 * Analyze spending patterns by month
 */
export async function getMonthlyPatterns(
  db: D1Database,
  userId: string,
  months: number = 12
): Promise<MonthlySpendingPattern[]> {
  const result = await db
    .prepare(`
      WITH monthly_data AS (
        SELECT
          cast(strftime('%m', t.transaction_date) as integer) as month,
          strftime('%Y', t.transaction_date) as year,
          COALESCE(SUM(
            CASE
              WHEN t.transaction_type = 'expense' THEN ABS(t.amount)
              ELSE 0
            END
          ), 0) as total_amount,
          COUNT(t.id) as transaction_count
        FROM transactions t
        WHERE t.user_id = ?
          AND t.transaction_type IN ('expense', 'refund')
          AND t.is_reconciled = 1
          AND date(t.transaction_date) >= date('now', '-' || ? || ' months')
        GROUP BY month, year
      ),
      month_totals AS (
        SELECT
          month,
          SUM(total_amount) as total_amount,
          SUM(transaction_count) as transaction_count,
          COUNT(DISTINCT year) as year_count
        FROM monthly_data
        GROUP BY month
      )
      SELECT
        m.month,
        CASE m.month
          WHEN 1 THEN 'January'
          WHEN 2 THEN 'February'
          WHEN 3 THEN 'March'
          WHEN 4 THEN 'April'
          WHEN 5 THEN 'May'
          WHEN 6 THEN 'June'
          WHEN 7 THEN 'July'
          WHEN 8 THEN 'August'
          WHEN 9 THEN 'September'
          WHEN 10 THEN 'October'
          WHEN 11 THEN 'November'
          WHEN 12 THEN 'December'
        END as month_name,
        m.total_amount,
        m.transaction_count,
        m.year_count
      FROM month_totals m
      ORDER BY m.month
    `)
    .bind(userId, months)
    .all();

  const data = (result.results as any[]) || [];

  return data.map((row) => ({
    month: row.month,
    monthName: row.month_name,
    totalAmount: row.total_amount,
    averageAmount: row.year_count > 0 ? row.total_amount / row.year_count : 0,
    transactionCount: row.transaction_count,
  }));
}

// ============================================================================
// Category Heatmap
// ============================================================================

/**
 * Analyze spending by category
 */
export async function getCategorySpending(
  db: D1Database,
  userId: string,
  days: number = 90
): Promise<CategorySpendingHeatmap[]> {
  const result = await db
    .prepare(`
      SELECT
        c.id as category_id,
        COALESCE(c.name, 'Uncategorized') as category_name,
        COALESCE(SUM(
          CASE
            WHEN t.transaction_type = 'expense' THEN ABS(t.amount)
            ELSE 0
          END
        ), 0) as total_amount,
        COUNT(t.id) as transaction_count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
        AND t.transaction_type IN ('expense', 'refund')
        AND t.is_reconciled = 1
        AND date(t.transaction_date) >= date('now', '-' || ? || ' days')
      GROUP BY c.id, c.name
      ORDER BY total_amount DESC
    `)
    .bind(userId, days)
    .all();

  const data = (result.results as any[]) || [];

  // Calculate total for percentage
  const totalAmount = data.reduce((sum, row) => sum + row.total_amount, 0);

  return data.map((row) => ({
    categoryId: row.category_id,
    categoryName: row.category_name,
    totalAmount: row.total_amount,
    transactionCount: row.transaction_count,
    averageAmount: row.transaction_count > 0 ? row.total_amount / row.transaction_count : 0,
    percentageOfTotal: totalAmount > 0 ? (row.total_amount / totalAmount) * 100 : 0,
  }));
}

// ============================================================================
// Hourly Patterns
// ============================================================================

/**
 * Analyze spending patterns by hour of day
 */
export async function getHourlyPatterns(
  db: D1Database,
  userId: string,
  days: number = 90
): Promise<HourlySpendingPattern[]> {
  const result = await db
    .prepare(`
      SELECT
        cast(strftime('%H', t.transaction_date) as integer) as hour,
        COALESCE(SUM(
          CASE
            WHEN t.transaction_type = 'expense' THEN ABS(t.amount)
            ELSE 0
          END
        ), 0) as total_amount,
        COUNT(t.id) as transaction_count
      FROM transactions t
      WHERE t.user_id = ?
        AND t.transaction_type IN ('expense', 'refund')
        AND t.is_reconciled = 1
        AND date(t.transaction_date) >= date('now', '-' || ? || ' days')
      GROUP BY hour
      ORDER BY hour
    `)
    .bind(userId, days)
    .all();

  const data = (result.results as any[]) || [];

  // Fill in all hours (0-23)
  const allHours: HourlySpendingPattern[] = [];
  const dataMap = new Map(data.map((d) => [d.hour, d]));

  for (let h = 0; h < 24; h++) {
    const row = dataMap.get(h);
    allHours.push(
      row || {
        hour: h,
        totalAmount: 0,
        transactionCount: 0,
        averageAmount: 0,
      }
    );
  }

  // Calculate averages based on days in period
  const daysCount = Math.min(days, 90);
  return allHours.map((h) => ({
    ...h,
    averageAmount: daysCount > 0 ? h.totalAmount / daysCount : 0,
  }));
}

// ============================================================================
// Summary
// ============================================================================

/**
 * Generate overall spending insights summary
 */
export async function getSpendingInsightsSummary(
  db: D1Database,
  userId: string,
  days: number = 90
): Promise<SpendingInsightsSummary> {
  // Get daily data for highest/lowest
  const dailyData = await getDailySpendingHeatmap(db, userId, undefined, undefined, days);

  let highestDay: { date: string; amount: number } | null = null;
  let lowestDay: { date: string; amount: number } | null = null;

  for (const day of dailyData) {
    if (!highestDay || day.amount > highestDay.amount) {
      highestDay = { date: day.date, amount: day.amount };
    }
    if (!lowestDay || day.amount < lowestDay.amount) {
      lowestDay = { date: day.date, amount: day.amount };
    }
  }

  // Get top category
  const categoryData = await getCategorySpending(db, userId, days);
  const topCategory =
    categoryData.length > 0
      ? { name: categoryData[0].categoryName, amount: categoryData[0].totalAmount }
      : null;

  // Get busiest day of week
  const dowData = await getDayOfWeekPatterns(db, userId, days);
  const busiestDayOfWeek =
    dowData.length > 0
      ? dowData.reduce((max, day) =>
          day.totalAmount > max.totalAmount ? day : max
        )
      : null;

  // Get peak hour
  const hourlyData = await getHourlyPatterns(db, userId, days);
  const peakHourData = hourlyData.reduce((max, hour) =>
    hour.totalAmount > max.totalAmount ? hour : max
  );

  // Calculate totals
  const totalPeriod = dailyData.reduce((sum, day) => sum + day.amount, 0);
  const averageDaily = dailyData.length > 0 ? totalPeriod / dailyData.length : 0;

  return {
    totalPeriod,
    averageDaily,
    highestDay,
    lowestDay,
    topCategory,
    busiestDayOfWeek: busiestDayOfWeek
      ? { day: busiestDayOfWeek.dayName, amount: busiestDayOfWeek.totalAmount }
      : null,
    peakSpendingHour: peakHourData.totalAmount > 0 ? peakHourData.hour : null,
  };
}

/**
 * Get all spending insights data in one call
 */
export async function getAllSpendingInsights(
  db: D1Database,
  userId: string,
  days: number = 90
) {
  const [summary, dailyHeatmap, dayOfWeek, monthly, categories, hourly] =
    await Promise.all([
      getSpendingInsightsSummary(db, userId, days),
      getDailySpendingHeatmap(db, userId, undefined, undefined, days),
      getDayOfWeekPatterns(db, userId, days),
      getMonthlyPatterns(db, userId, 12),
      getCategorySpending(db, userId, days),
      getHourlyPatterns(db, userId, days),
    ]);

  return {
    summary,
    dailyHeatmap,
    dayOfWeek,
    monthly,
    categories,
    hourly,
  };
}
