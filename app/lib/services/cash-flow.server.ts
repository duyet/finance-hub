/**
 * Cash Flow Forecasting Service
 *
 * Predicts future cash balance based on recurring transactions
 * and generates alerts for potential low balance scenarios
 */

import type { D1Database } from "@cloudflare/workers-types";

// ============================================================================
// Types
// ============================================================================

export interface CashFlowPrediction {
  id: string;
  userId: string;
  predictionDate: string;
  forecastDate: string;
  openingBalance: number;
  expectedIncome: number;
  expectedExpenses: number;
  closingBalance: number;
  confidenceLevel: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface CashFlowAlert {
  id: string;
  userId: string;
  alertDate: string;
  predictedBalance: number;
  threshold: number;
  severity: "warning" | "critical";
  isResolved: boolean;
  resolvedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface CashFlowSummary {
  currentBalance: number;
  minBalance: number;
  minBalanceDate: string | null;
  totalIncome: number;
  totalExpenses: number;
  netChange: number;
  daysBelowThreshold: number;
  hasCriticalAlerts: boolean;
}

export interface DailyCashFlow {
  date: string;
  openingBalance: number;
  income: number;
  expenses: number;
  closingBalance: number;
  confidence: number;
  transactions: {
    id: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    isRecurring: boolean;
  }[];
}

export interface GenerateForecastInput {
  userId: string;
  startDate?: string;
  days: number;
  confidenceThreshold?: number;
}

// ============================================================================
// Cash Flow Forecasting
// ============================================================================

/**
 * Generate cash flow forecast for specified number of days
 */
export async function generateCashFlowForecast(
  db: D1Database,
  input: GenerateForecastInput
): Promise<CashFlowPrediction[]> {
  const { userId, startDate, days = 30, confidenceThreshold = 0.7 } = input;

  const start = startDate
    ? new Date(startDate)
    : new Date();

  const predictions: CashFlowPrediction[] = [];

  // Get current account balance as starting point
  const accountResult = await db
    .prepare(`SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ? AND is_active = 1`)
    .bind(userId)
    .first();
  const currentBalance = Number((accountResult?.total as number) || 0);

  // Get active recurring transactions
  const recurringResult = await db
    .prepare(`
      SELECT id, description, amount, frequency, day_of_month,
             transaction_type, category_id
      FROM recurring_transactions
      WHERE user_id = ? AND is_active = 1
    `)
    .bind(userId)
    .all();

  const recurringTransactions = recurringResult.results as {
    id: string;
    description: string;
    amount: number;
    frequency: string;
    day_of_month: number | null;
    transaction_type: string;
    category_id: string | null;
  }[];

  let runningBalance = currentBalance;

  // Generate daily predictions
  for (let i = 0; i < days; i++) {
    const forecastDate = new Date(start);
    forecastDate.setDate(forecastDate.getDate() + i);
    const dateStr = forecastDate.toISOString().split("T")[0];

    // Calculate expected transactions for this day
    const dailyIncome = calculateDailyRecurringAmount(
      recurringTransactions,
      forecastDate,
      "income"
    );
    const dailyExpenses = calculateDailyRecurringAmount(
      recurringTransactions,
      forecastDate,
      "expense"
    );

    const openingBalance = runningBalance;
    const closingBalance = runningBalance + dailyIncome - dailyExpenses;
    const confidenceLevel = calculateConfidence(forecastDate, start, days);

    // Only save predictions with confidence above threshold
    if (confidenceLevel >= confidenceThreshold) {
      const prediction: CashFlowPrediction = {
        id: crypto.randomUUID(),
        userId,
        predictionDate: new Date().toISOString(),
        forecastDate: dateStr,
        openingBalance,
        expectedIncome: dailyIncome,
        expectedExpenses: dailyExpenses,
        closingBalance,
        confidenceLevel,
        notes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: null,
      };

      // Delete existing prediction for this date
      await db
        .prepare(`DELETE FROM cash_flow_predictions WHERE user_id = ? AND forecast_date = ?`)
        .bind(userId, dateStr)
        .run();

      // Insert new prediction
      await db
        .prepare(`
          INSERT INTO cash_flow_predictions (
            id, user_id, prediction_date, forecast_date,
            opening_balance, expected_income, expected_expenses, closing_balance,
            confidence_level, notes, created_at, updated_at, metadata
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          prediction.id,
          prediction.userId,
          prediction.predictionDate,
          prediction.forecastDate,
          prediction.openingBalance,
          prediction.expectedIncome,
          prediction.expectedExpenses,
          prediction.closingBalance,
          prediction.confidenceLevel,
          prediction.notes,
          prediction.createdAt,
          prediction.updatedAt,
          prediction.metadata ? JSON.stringify(prediction.metadata) : null
        )
        .run();

      predictions.push(prediction);
    }

    runningBalance = closingBalance;
  }

  return predictions;
}

/**
 * Calculate recurring transaction amount for a specific date
 */
function calculateDailyRecurringAmount(
  transactions: {
    id: string;
    description: string;
    amount: number;
    frequency: string;
    day_of_month: number | null;
    transaction_type: string;
    category_id: string | null;
  }[],
  date: Date,
  type: "income" | "expense"
): number {
  let total = 0;

  for (const tx of transactions) {
    // Skip if transaction type doesn't match
    const isIncome = tx.transaction_type.toLowerCase() === "income";
    if (isIncome && type !== "income") continue;
    if (!isIncome && type !== "expense") continue;

    // Check if transaction occurs on this date based on frequency
    if (shouldTransactionOccur(tx, date)) {
      total += Math.abs(tx.amount);
    }
  }

  return total;
}

/**
 * Determine if a recurring transaction should occur on a specific date
 */
function shouldTransactionOccur(
  tx: {
    frequency: string;
    day_of_month: number | null;
  },
  date: Date
): boolean {
  const dayOfMonth = date.getDate();
  const dayOfWeek = date.getDay();
  const weekOfMonth = Math.ceil(dayOfMonth / 7);

  switch (tx.frequency.toLowerCase()) {
    case "daily":
      return true;

    case "weekly":
      // Transactions occur on the same day of the week
      // Use day_of_month as the target day (0=Sunday, 6=Saturday)
      return tx.day_of_month !== null && dayOfWeek === tx.day_of_month;

    case "biweekly":
      // Every two weeks - would need last transaction date
      // For simplicity, use every other week based on day of week
      if (tx.day_of_month === null) return false;
      const weekNumber = Math.floor((dayOfMonth - 1) / 7);
      return dayOfWeek === tx.day_of_month && weekNumber % 2 === 0;

    case "monthly":
      // Same day each month
      return tx.day_of_month !== null && dayOfMonth === tx.day_of_month;

    case "quarterly":
      // Every 3 months on the same day
      return tx.day_of_month !== null &&
             dayOfMonth === tx.day_of_month &&
             (date.getMonth() % 3 === 0);

    case "yearly":
      // Same date each year - would need month and day
      // Simplified: use day_of_month as day of year approximation
      return false; // Requires more sophisticated logic

    default:
      return false;
  }
}

/**
 * Calculate confidence level for a prediction
 * Decreases as the forecast date gets further from today
 */
function calculateConfidence(forecastDate: Date, startDate: Date, totalDays: number): number {
  const daysDiff = Math.floor((forecastDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const confidence = 1 - (daysDiff / totalDays) * 0.5; // Drops to 0.5 at the end of the period
  return Math.max(0, Math.min(1, confidence));
}

// ============================================================================
// Cash Flow Summary
// ============================================================================

/**
 * Get cash flow summary from predictions
 */
export async function getCashFlowSummary(
  db: D1Database,
  userId: string,
  days: number = 30
): Promise<CashFlowSummary> {
  // Get current balance
  const accountResult = await db
    .prepare(`SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ? AND is_active = 1`)
    .bind(userId)
    .first();
  const currentBalance = Number((accountResult?.total as number) || 0);

  // Get predictions for the specified period
  const predictionsResult = await db
    .prepare(`
      SELECT forecast_date, closing_balance, expected_income, expected_expenses
      FROM cash_flow_predictions
      WHERE user_id = ?
        AND forecast_date >= date('now')
        AND forecast_date <= date('now', '+' || ? || ' days')
      ORDER BY forecast_date ASC
    `)
    .bind(userId, days)
    .all();

  const predictions = predictionsResult.results as {
    forecast_date: string;
    closing_balance: number;
    expected_income: number;
    expected_expenses: number;
  }[];

  let minBalance = currentBalance;
  let minBalanceDate: string | null = null;
  let totalIncome = 0;
  let totalExpenses = 0;
  let daysBelowThreshold = 0;
  const threshold = currentBalance * 0.2; // Alert when below 20% of current balance

  for (const prediction of predictions) {
    if (prediction.closing_balance < minBalance) {
      minBalance = prediction.closing_balance;
      minBalanceDate = prediction.forecast_date;
    }

    totalIncome += prediction.expected_income;
    totalExpenses += prediction.expected_expenses;

    if (prediction.closing_balance < threshold) {
      daysBelowThreshold++;
    }
  }

  const netChange = totalIncome - totalExpenses;

  // Check for critical alerts
  const criticalResult = await db
    .prepare(`
      SELECT COUNT(*) as count
      FROM cash_flow_alerts
      WHERE user_id = ? AND severity = 'critical' AND is_resolved = 0
    `)
    .bind(userId)
    .first();
  const hasCriticalAlerts = Number((criticalResult?.count as number) || 0) > 0;

  return {
    currentBalance,
    minBalance,
    minBalanceDate,
    totalIncome,
    totalExpenses,
    netChange,
    daysBelowThreshold,
    hasCriticalAlerts,
  };
}

// ============================================================================
// Alert Management
// ============================================================================

/**
 * Generate and save cash flow alerts based on predictions
 */
export async function generateCashFlowAlerts(
  db: D1Database,
  userId: string,
  thresholdPercent: number = 20
): Promise<CashFlowAlert[]> {
  // Get current balance
  const accountResult = await db
    .prepare(`SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ? AND is_active = 1`)
    .bind(userId)
    .first();
  const currentBalance = Number((accountResult?.total as number) || 0);

  const warningThreshold = currentBalance * (thresholdPercent / 100);
  const criticalThreshold = currentBalance * (thresholdPercent / 200); // Half of warning

  const alerts: CashFlowAlert[] = [];

  // Get future predictions
  const predictionsResult = await db
    .prepare(`
      SELECT forecast_date, closing_balance
      FROM cash_flow_predictions
      WHERE user_id = ? AND forecast_date >= date('now')
      ORDER BY forecast_date ASC
    `)
    .bind(userId)
    .all();

  const predictions = predictionsResult.results as {
    forecast_date: string;
    closing_balance: number;
  }[];

  for (const prediction of predictions) {
    const { forecast_date, closing_balance } = prediction;

    // Check if balance is below threshold
    if (closing_balance < warningThreshold) {
      const severity: "warning" | "critical" =
        closing_balance < criticalThreshold ? "critical" : "warning";

      // Check if alert already exists
      const existingResult = await db
        .prepare(`
          SELECT id FROM cash_flow_alerts
          WHERE user_id = ? AND alert_date = ? AND is_resolved = 0
        `)
        .bind(userId, forecast_date)
        .first();

      if (!existingResult) {
        const alert: CashFlowAlert = {
          id: crypto.randomUUID(),
          userId,
          alertDate: forecast_date,
          predictedBalance: closing_balance,
          threshold: warningThreshold,
          severity,
          isResolved: false,
          resolvedAt: null,
          notes: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: null,
        };

        await db
          .prepare(`
            INSERT INTO cash_flow_alerts (
              id, user_id, alert_date, predicted_balance, threshold,
              severity, is_resolved, resolved_at, notes, created_at, updated_at, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `)
          .bind(
            alert.id,
            alert.userId,
            alert.alertDate,
            alert.predictedBalance,
            alert.threshold,
            alert.severity,
            alert.isResolved ? 1 : 0,
            alert.resolvedAt,
            alert.notes,
            alert.createdAt,
            alert.updatedAt,
            alert.metadata ? JSON.stringify(alert.metadata) : null
          )
          .run();

        alerts.push(alert);
      }
    }
  }

  return alerts;
}

/**
 * Get unresolved alerts for a user
 */
export async function getCashFlowAlerts(
  db: D1Database,
  userId: string,
  includeResolved: boolean = false
): Promise<CashFlowAlert[]> {
  let query = `
    SELECT id, user_id, alert_date, predicted_balance, threshold,
           severity, is_resolved, resolved_at, notes, created_at, updated_at, metadata
    FROM cash_flow_alerts
    WHERE user_id = ?
  `;

  if (!includeResolved) {
    query += ` AND is_resolved = 0`;
  }

  query += ` ORDER BY alert_date ASC`;

  const result = await db.prepare(query).bind(userId).all();

  return (result.results as any[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    alertDate: row.alert_date,
    predictedBalance: row.predicted_balance,
    threshold: row.threshold,
    severity: row.severity,
    isResolved: Boolean(row.is_resolved),
    resolvedAt: row.resolved_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  }));
}

/**
 * Resolve an alert
 */
export async function resolveCashFlowAlert(
  db: D1Database,
  alertId: string
): Promise<void> {
  await db
    .prepare(`
      UPDATE cash_flow_alerts
      SET is_resolved = 1, resolved_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `)
    .bind(alertId)
    .run();
}

// ============================================================================
// Get Predictions
// ============================================================================

/**
 * Get cash flow predictions for a date range
 */
export async function getCashFlowPredictions(
  db: D1Database,
  userId: string,
  days: number = 30
): Promise<CashFlowPrediction[]> {
  const result = await db
    .prepare(`
      SELECT id, user_id, prediction_date, forecast_date,
             opening_balance, expected_income, expected_expenses, closing_balance,
             confidence_level, notes, created_at, updated_at, metadata
      FROM cash_flow_predictions
      WHERE user_id = ?
        AND forecast_date >= date('now')
        AND forecast_date <= date('now', '+' || ? || ' days')
      ORDER BY forecast_date ASC
    `)
    .bind(userId, days)
    .all();

  return (result.results as any[]).map((row) => ({
    id: row.id,
    userId: row.user_id,
    predictionDate: row.prediction_date,
    forecastDate: row.forecast_date,
    openingBalance: row.opening_balance,
    expectedIncome: row.expected_income,
    expectedExpenses: row.expected_expenses,
    closingBalance: row.closing_balance,
    confidenceLevel: row.confidence_level,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata ? JSON.parse(row.metadata) : null,
  }));
}

/**
 * Get detailed daily cash flow with transaction breakdown
 */
export async function getDailyCashFlow(
  db: D1Database,
  userId: string,
  days: number = 30
): Promise<DailyCashFlow[]> {
  const predictions = await getCashFlowPredictions(db, userId, days);
  const dailyFlows: DailyCashFlow[] = [];

  for (const prediction of predictions) {
    // Get recurring transactions for this date
    const forecastDate = new Date(prediction.forecastDate);
    const recurringResult = await db
      .prepare(`
        SELECT id, description, amount, transaction_type
        FROM recurring_transactions
        WHERE user_id = ? AND is_active = 1
      `)
      .bind(userId)
      .all();

    const transactions = (recurringResult.results as any[])
      .filter((tx) => {
        const txData = {
          frequency: tx.frequency,
          day_of_month: tx.day_of_month,
        };
        return shouldTransactionOccur(txData, forecastDate);
      })
      .map((tx) => ({
        id: tx.id,
        description: tx.description,
        amount: Math.abs(tx.amount),
        type: tx.transaction_type.toLowerCase() === "income" ? "income" as const : "expense" as const,
        isRecurring: true,
      }));

    dailyFlows.push({
      date: prediction.forecastDate,
      openingBalance: prediction.openingBalance,
      income: prediction.expectedIncome,
      expenses: prediction.expectedExpenses,
      closingBalance: prediction.closingBalance,
      confidence: prediction.confidenceLevel,
      transactions,
    });
  }

  return dailyFlows;
}

/**
 * Regenerate forecast by deleting old predictions and generating new ones
 */
export async function regenerateCashFlowForecast(
  db: D1Database,
  userId: string,
  days: number = 30
): Promise<void> {
  // Delete existing predictions
  await db
    .prepare(`DELETE FROM cash_flow_predictions WHERE user_id = ?`)
    .bind(userId)
    .run();

  // Delete existing unresolved alerts
  await db
    .prepare(`DELETE FROM cash_flow_alerts WHERE user_id = ? AND is_resolved = 0`)
    .bind(userId)
    .run();

  // Generate new predictions
  await generateCashFlowForecast(db, { userId, days });

  // Generate new alerts
  await generateCashFlowAlerts(db, userId);
}
