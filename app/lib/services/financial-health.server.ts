/**
 * Financial Health Score Service
 *
 * Calculates financial health score based on multiple factors:
 * - Savings rate (income vs expenses)
 * - Spending consistency (low variance in monthly spending)
 * - Debt management (debt-to-income ratio, payment history)
 * - Income stability (consistent income over time)
 * - Emergency fund (months of expenses saved)
 * - Investment diversification (spread across different asset classes)
 *
 * Score: 0-100, with:
 * - 90-100: Excellent
 * - 75-89: Good
 * - 60-74: Fair
 * - 40-59: Poor
 * - 0-39: Critical
 */

import type { D1Database } from "@cloudflare/workers-types";

/**
 * Financial health score result
 */
export interface FinancialHealthScore {
  score: number;
  category: "excellent" | "good" | "fair" | "poor" | "critical";
  factors: HealthFactor[];
  calculatedAt: string;
}

/**
 * Individual health factor
 */
export interface HealthFactor {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1, contribution to total score
  value: number; // Raw value for display
  description: string;
  recommendation?: string;
}

/**
 * Transaction data for health calculation
 */
interface TransactionData {
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
  spendingVariance: number;
  debtPayments: number;
  emergencyFundMonths?: number;
  monthlyIncomeVariance: number;
}

/**
 * Calculate savings rate score (0-100)
 * Measures what percentage of income is saved
 */
function calculateSavingsRateScore(savingsRate: number): HealthFactor {
  // Savings rate > 20% is excellent, 10-20% is good, 0-10% is poor
  let score = 0;
  let description = "";
  let recommendation = "";

  if (savingsRate >= 0.2) {
    score = 100;
    description = `Excellent savings rate of ${(savingsRate * 100).toFixed(1)}%`;
  } else if (savingsRate >= 0.1) {
    score = 75 + (savingsRate - 0.1) * 250; // 75-100
    description = `Good savings rate of ${(savingsRate * 100).toFixed(1)}%`;
  } else if (savingsRate >= 0) {
    score = savingsRate * 750; // 0-75
    description = `Savings rate of ${(savingsRate * 100).toFixed(1)}% could be improved`;
    recommendation = "Try to save at least 10% of your income";
  } else {
    score = 0;
    description = `Negative savings rate of ${(savingsRate * 100).toFixed(1)}%`;
    recommendation = "You're spending more than you earn. Review your expenses.";
  }

  return {
    name: "Savings Rate",
    score,
    weight: 0.25,
    value: savingsRate,
    description,
    recommendation,
  };
}

/**
 * Calculate spending consistency score (0-100)
 * Measures how predictable spending is month to month
 */
function calculateSpendingConsistencyScore(variance: number): HealthFactor {
  // Lower variance is better - <10% variance is excellent, >30% is poor
  let score = 0;
  let description = "";
  let recommendation = "";

  if (variance <= 0.1) {
    score = 100;
    description = "Very consistent spending patterns";
  } else if (variance <= 0.2) {
    score = 80 - (variance - 0.1) * 200; // 60-100
    description = "Mostly consistent spending";
  } else if (variance <= 0.3) {
    score = 60 - (variance - 0.2) * 400; // 20-80
    description = "Some spending variability";
    recommendation = "Track your spending to reduce unexpected expenses";
  } else {
    score = Math.max(0, 20 - (variance - 0.3) * 200); // 0-40
    description = "Highly variable spending";
    recommendation = "Your spending fluctuates significantly. Create a budget.";
  }

  return {
    name: "Spending Consistency",
    score,
    weight: 0.15,
    value: variance,
    description,
    recommendation,
  };
}

/**
 * Calculate debt management score (0-100)
 * Based on debt-to-income ratio
 */
function calculateDebtManagementScore(
  debtPayments: number,
  totalIncome: number
): HealthFactor {
  const debtToIncome = totalIncome > 0 ? debtPayments / totalIncome : 0;
  let score = 0;
  let description = "";
  let recommendation = "";

  if (debtToIncome <= 0.1) {
    score = 100;
    description = `Low debt-to-income ratio of ${(debtToIncome * 100).toFixed(1)}%`;
  } else if (debtToIncome <= 0.2) {
    score = 90 - (debtToIncome - 0.1) * 400; // 50-100
    description = `Manageable debt-to-income ratio of ${(debtToIncome * 100).toFixed(1)}%`;
  } else if (debtToIncome <= 0.3) {
    score = 50 - (debtToIncome - 0.2) * 500; // 0-50
    description = `High debt-to-income ratio of ${(debtToIncome * 100).toFixed(1)}%`;
    recommendation = "Your debt payments are high. Focus on debt reduction.";
  } else {
    score = 0;
    description = `Critical debt-to-income ratio of ${(debtToIncome * 100).toFixed(1)}%`;
    recommendation = "Debt is consuming >30% of income. Seek financial advice.";
  }

  return {
    name: "Debt Management",
    score,
    weight: 0.25,
    value: debtToIncome,
    description,
    recommendation,
  };
}

/**
 * Calculate income stability score (0-100)
 * Measures consistency of income over time
 */
function calculateIncomeStabilityScore(variance: number): HealthFactor {
  // Lower variance is better - <5% variance is excellent, >20% is poor
  let score = 0;
  let description = "";
  let recommendation = "";

  if (variance <= 0.05) {
    score = 100;
    description = "Very stable income";
  } else if (variance <= 0.1) {
    score = 90 - (variance - 0.05) * 200; // 80-100
    description = "Stable income with minor fluctuations";
  } else if (variance <= 0.2) {
    score = 80 - (variance - 0.1) * 500; // 30-80
    description = "Moderate income variability";
    recommendation = "Build an emergency fund to handle income fluctuations";
  } else {
    score = Math.max(0, 30 - (variance - 0.2) * 300); // 0-30
    description = "Highly variable income";
    recommendation = "Income varies significantly. Diversify your income sources.";
  }

  return {
    name: "Income Stability",
    score,
    weight: 0.15,
    value: variance,
    description,
    recommendation,
  };
}

/**
 * Calculate emergency fund score (0-100)
 * Measures months of expenses saved
 */
function calculateEmergencyFundScore(months: number): HealthFactor {
  // 6+ months is excellent, 3-6 is good, 1-3 is fair, <1 is poor
  let score = 0;
  let description = "";
  let recommendation = "";

  if (months >= 6) {
    score = 100;
    description = `${months.toFixed(1)} months of expenses saved`;
  } else if (months >= 3) {
    score = 75 + (months - 3) * 8.33; // 75-100
    description = `${months.toFixed(1)} months of expenses saved`;
  } else if (months >= 1) {
    score = 25 + (months - 1) * 25; // 25-75
    description = `${months.toFixed(1)} months of expenses saved`;
    recommendation = "Aim to save 3-6 months of expenses";
  } else if (months > 0) {
    score = months * 25; // 0-25
    description = `${months.toFixed(1)} months of expenses saved`;
    recommendation = "Build an emergency fund with at least 1 month of expenses";
  } else {
    score = 0;
    description = "No emergency fund detected";
    recommendation = "Start building an emergency fund immediately";
  }

  return {
    name: "Emergency Fund",
    score,
    weight: 0.2,
    value: months,
    description,
    recommendation,
  };
}

/**
 * Get overall score category
 */
function getScoreCategory(score: number): "excellent" | "good" | "fair" | "poor" | "critical" {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "fair";
  if (score >= 40) return "poor";
  return "critical";
}

/**
 * Calculate financial health score
 */
export async function calculateFinancialHealthScore(
  db: D1Database,
  userId: string
): Promise<FinancialHealthScore> {
  // Get transaction data for the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const transactionsResult = await db
    .prepare(
      `SELECT
         date,
         SUM(CASE WHEN amount >= 0 THEN amount ELSE 0 END) as income,
         SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as expenses
       FROM transactions
       WHERE user_id = ? AND date >= ?
       GROUP BY strftime('%Y-%m', date)
       ORDER BY date DESC`
    )
    .bind(userId, sixMonthsAgo.toISOString().split('T')[0])
    .all();

  const monthlyData = (transactionsResult.results || []) as Array<{
    date: string;
    income: number;
    expenses: number;
  }>;

  if (monthlyData.length === 0) {
    // No data yet
    return {
      score: 50,
      category: "fair",
      factors: [],
      calculatedAt: new Date().toISOString(),
    };
  }

  // Calculate aggregates
  const totalIncome = monthlyData.reduce((sum, m) => sum + (m.income || 0), 0);
  const totalExpenses = monthlyData.reduce((sum, m) => sum + (m.expenses || 0), 0);
  const avgMonthlyIncome = totalIncome / monthlyData.length;
  const avgMonthlyExpenses = totalExpenses / monthlyData.length;

  // Calculate variance (standard deviation / mean)
  const incomeValues = monthlyData.map(m => m.income || 0);
  const expenseValues = monthlyData.map(m => m.expenses || 0);
  const incomeMean = incomeValues.reduce((a, b) => a + b, 0) / incomeValues.length;
  const expenseMean = expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length;
  const incomeVariance = incomeMean > 0
    ? Math.sqrt(incomeValues.reduce((sum, val) => sum + Math.pow(val - incomeMean, 2), 0) / incomeValues.length) / incomeMean
    : 0;
  const spendingVariance = expenseMean > 0
    ? Math.sqrt(expenseValues.reduce((sum, val) => sum + Math.pow(val - expenseMean, 2), 0) / expenseValues.length) / expenseMean
    : 0;

  // Calculate savings rate
  const savingsRate = totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;

  // Get debt payments
  const debtResult = await db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) as debt_payments
       FROM transactions
       WHERE user_id = ?
       AND category_id IN (SELECT id FROM categories WHERE name LIKE '%loan%' OR name LIKE '%debt%')
       AND amount < 0
       AND date >= ?`
    )
    .bind(userId, sixMonthsAgo.toISOString().split('T')[0])
    .first();

  const debtPayments = Math.abs(debtResult?.debt_payments as number || 0);

  // Calculate emergency fund (savings / monthly expenses)
  const emergencyFundResult = await db
    .prepare(
      `SELECT COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as savings
       FROM transactions
       WHERE user_id = ?
       AND category_id IN (SELECT id FROM categories WHERE name LIKE '%savings%' OR name LIKE '%cash%')`
    )
    .bind(userId)
    .first();

  const savings = emergencyFundResult?.savings as number || 0;
  const emergencyFundMonths = avgMonthlyExpenses > 0 ? savings / avgMonthlyExpenses : 0;

  // Calculate individual factor scores
  const factors: HealthFactor[] = [
    calculateSavingsRateScore(savingsRate),
    calculateSpendingConsistencyScore(spendingVariance),
    calculateDebtManagementScore(debtPayments, avgMonthlyIncome),
    calculateIncomeStabilityScore(incomeVariance),
    calculateEmergencyFundScore(emergencyFundMonths),
  ];

  // Calculate weighted total score
  const totalScore = factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0);

  return {
    score: Math.round(totalScore),
    category: getScoreCategory(totalScore),
    factors,
    calculatedAt: new Date().toISOString(),
  };
}

// Utility functions moved to financial-health.utils.ts for client-side use
