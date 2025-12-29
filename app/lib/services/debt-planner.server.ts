/**
 * Debt Planner Service
 *
 * Provides debt payoff strategies and optimization recommendations
 * by aggregating data from loans and credit cards.
 */

import type { D1Database } from "@cloudflare/workers-types";

/**
 * Debt item (unified representation of loan or credit card debt)
 */
export interface DebtItem {
  id: string;
  name: string;
  type: "loan" | "credit_card";
  balance: number;
  interestRate: number;
  minimumPayment: number;
  monthlyPayment?: number;
  dueDate?: number; // day of month
}

/**
 * Debt payoff strategy options
 */
export type PayoffStrategy = "snowball" | "avalanche" | "highest_balance";

/**
 * Payoff plan with projection
 */
export interface PayoffPlan {
  strategy: PayoffStrategy;
  totalDebt: number;
  totalMinimumPayment: number;
  recommendedPayment: number;
  monthsToDebtFree: number;
  totalInterestPaid: number;
  debtFreeDate: string;
  monthlyBreakdown: Array<{
    month: number;
    date: string;
    debts: Array<{
      debtId: string;
      balance: number;
      payment: number;
      interestPaid: number;
      paidOff: boolean;
    }>;
    remainingDebt: number;
  }>;
  debtPayoffOrder: Array<{
    debtId: string;
    debtName: string;
    payoffMonth: number;
    payoffDate: string;
  }>;
}

/**
 * Debt summary statistics
 */
export interface DebtSummary {
  totalDebt: number;
  totalMinimumPayment: number;
  totalMonthlyPayment: number;
  averageInterestRate: number;
  debtCount: number;
  highestInterestRate: number;
  lowestInterestRate: number;
  debtFreeMonths: number; // at minimum payments
}

/**
 * Get all debts for a user (loans + credit cards)
 */
export async function getAllDebts(db: D1Database, userId: string): Promise<DebtItem[]> {
  const debts: DebtItem[] = [];

  // Get active loans
  const loansResult = await db
    .prepare(`
      SELECT
        l.account_id as id,
        fa.financial_institution || fa.account_type as name,
        'loan' as type,
        l.principal_outstanding as balance,
        l.current_interest_rate as interestRate,
        COALESCE(li.total_amount, 0) as minimumPayment,
        l.payment_day_of_month as dueDate
      FROM loans l
      INNER JOIN financial_accounts fa ON l.account_id = fa.id
      LEFT JOIN (
        SELECT loan_id, MIN(total_amount) as total_amount
        FROM loan_installments
        WHERE status IN ('ESTIMATED', 'DUE')
        GROUP BY loan_id
      ) li ON l.account_id = li.loan_id
      WHERE fa.user_id = ?
        AND l.is_active = 1
        AND l.principal_outstanding > 0
    `)
    .bind(userId)
    .all();

  const loans = (loansResult.results || []) as Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    interestRate: number;
    minimumPayment: number;
    dueDate: number | null;
  }>;

  for (const loan of loans) {
    debts.push({
      id: loan.id,
      name: loan.name,
      type: "loan",
      balance: loan.balance,
      interestRate: loan.interestRate / 100, // convert to decimal
      minimumPayment: loan.minimumPayment,
      dueDate: loan.dueDate ?? undefined,
    });
  }

  // Get credit card balances
  const cardsResult = await db
    .prepare(`
      SELECT
        cc.id,
        fa.financial_institution || fa.account_type as name,
        'credit_card' as type,
        cc.current_balance as balance,
        COALESCE(cc.apr, 0) as interestRate,
        cc.payment_due_day as dueDate
      FROM credit_cards cc
      INNER JOIN financial_accounts fa ON cc.account_id = fa.id
      WHERE fa.user_id = ?
        AND cc.is_active = 1
        AND cc.current_balance > 0
    `)
    .bind(userId)
    .all();

  const cards = (cardsResult.results || []) as Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    interestRate: number;
    dueDate: number | null;
  }>;

  for (const card of cards) {
    // Calculate minimum payment (typically 2-3% of balance)
    const minimumPayment = Math.max(card.balance * 0.03, 50);

    debts.push({
      id: card.id,
      name: card.name,
      type: "credit_card",
      balance: card.balance,
      interestRate: card.interestRate / 100, // convert to decimal
      minimumPayment,
      dueDate: card.dueDate ?? undefined,
    });
  }

  return debts;
}

/**
 * Get debt summary statistics
 */
export async function getDebtSummary(db: D1Database, userId: string): Promise<DebtSummary> {
  const debts = await getAllDebts(db, userId);

  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const totalMinimumPayment = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

  // Calculate weighted average interest rate
  const weightedRate = debts.length > 0
    ? debts.reduce((sum, debt) => sum + (debt.balance * debt.interestRate), 0) / totalDebt
    : 0;

  const interestRates = debts.map((d) => d.interestRate);

  // Estimate months to debt free at minimum payments
  // Using simplified amortization formula
  const monthsToDebtFree = debts.length > 0
    ? Math.max(...debts.map((debt) => {
        if (debt.minimumPayment <= debt.balance * debt.interestRate / 12) {
          return Infinity; // Never pays off
        }
        const r = debt.interestRate / 12;
        const n = -Math.log(1 - (debt.balance * r) / debt.minimumPayment) / Math.log(1 + r);
        return n;
      }))
    : 0;

  return {
    totalDebt,
    totalMinimumPayment,
    totalMonthlyPayment: totalMinimumPayment, // can be increased by user
    averageInterestRate: weightedRate,
    debtCount: debts.length,
    highestInterestRate: Math.max(...interestRates, 0),
    lowestInterestRate: Math.min(...interestRates, 0),
    debtFreeMonths: Math.round(monthsToDebtFree),
  };
}

/**
 * Sort debts by payoff strategy
 */
function sortDebtsByStrategy(debts: DebtItem[], strategy: PayoffStrategy): DebtItem[] {
  const sorted = [...debts];

  switch (strategy) {
    case "snowball":
      // Pay off lowest balance first
      return sorted.sort((a, b) => a.balance - b.balance);

    case "avalanche":
      // Pay off highest interest rate first
      return sorted.sort((a, b) => b.interestRate - a.interestRate);

    case "highest_balance":
      // Pay off highest balance first (for psychological boost of knocking out big debt)
      return sorted.sort((a, b) => b.balance - a.balance);

    default:
      return sorted;
  }
}

/**
 * Calculate debt payoff plan using specified strategy
 */
export async function calculatePayoffPlan(
  db: D1Database,
  userId: string,
  strategy: PayoffStrategy,
  monthlyPayment?: number
): Promise<PayoffPlan> {
  const debts = await getAllDebts(db, userId);

  if (debts.length === 0) {
    return {
      strategy,
      totalDebt: 0,
      totalMinimumPayment: 0,
      recommendedPayment: 0,
      monthsToDebtFree: 0,
      totalInterestPaid: 0,
      debtFreeDate: new Date().toISOString().split("T")[0],
      monthlyBreakdown: [],
      debtPayoffOrder: [],
    };
  }

  const totalMinimumPayment = debts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);

  // Use provided payment or default to minimum + 10%
  const payment = monthlyPayment || totalMinimumPayment * 1.1;

  // Sort debts by strategy
  const sortedDebts = sortDebtsByStrategy(debts, strategy);

  // Simulate payoff
  const monthlyBreakdown: PayoffPlan["monthlyBreakdown"] = [];
  const debtPayoffOrder: PayoffPlan["debtPayoffOrder"] = [];
  let currentDebts = sortedDebts.map((d) => ({ ...d }));
  let totalInterestPaid = 0;
  let month = 0;
  const maxMonths = 600; // 50 years max

  const startDate = new Date();

  while (currentDebts.length > 0 && month < maxMonths) {
    month++;

    // Calculate interest for this month
    const monthlyInterest = currentDebts.reduce((sum, debt) => {
      return sum + (debt.balance * debt.interestRate / 12);
    }, 0);

    // Distribute payment among debts
    let remainingPayment = payment;

    for (const debt of currentDebts) {
      const interestPayment = debt.balance * debt.interestRate / 12;
      const principalPayment = Math.min(
        debt.balance,
        remainingPayment - interestPayment - (currentDebts.indexOf(debt) === currentDebts.length - 1 ? 0 : debt.minimumPayment)
      );

      const totalPaymentForDebt = Math.min(debt.balance, interestPayment + principalPayment);

      debt.balance -= totalPaymentForDebt;
      remainingPayment -= totalPaymentForDebt;

      // Check if debt is paid off
      if (debt.balance <= 0.01) {
        debtPayoffOrder.push({
          debtId: debt.id,
          debtName: debt.name,
          payoffMonth: month,
          payoffDate: new Date(
            startDate.getFullYear(),
            startDate.getMonth() + month,
            1
          ).toISOString().split("T")[0],
        });

        // Track paid off debt in breakdown
        debt.balance = 0;
      }
    }

    // Remove paid off debts
    currentDebts = currentDebts.filter((d) => d.balance > 0.01);

    totalInterestPaid += monthlyInterest;

    // Record breakdown
    const breakdownDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() + month,
      1
    );

    monthlyBreakdown.push({
      month,
      date: breakdownDate.toISOString().split("T")[0],
      debts: sortedDebts.map((originalDebt) => {
        const currentDebt = currentDebts.find((d) => d.id === originalDebt.id);
        const isPaidOff = !currentDebt;

        return {
          debtId: originalDebt.id,
          balance: isPaidOff ? 0 : (currentDebt?.balance ?? originalDebt.balance),
          payment: isPaidOff ? originalDebt.balance : (currentDebt?.minimumPayment ?? originalDebt.minimumPayment),
          interestPaid: isPaidOff ? 0 : (currentDebt?.balance ?? originalDebt.balance) * originalDebt.interestRate / 12,
          paidOff: isPaidOff,
        };
      }),
      remainingDebt: currentDebts.reduce((sum, d) => sum + d.balance, 0),
    });

    if (currentDebts.length === 0) break;
  }

  const debtFreeDate = new Date(
    startDate.getFullYear(),
    startDate.getMonth() + month,
    1
  ).toISOString().split("T")[0];

  return {
    strategy,
    totalDebt,
    totalMinimumPayment,
    recommendedPayment: payment,
    monthsToDebtFree: month,
    totalInterestPaid: Math.round(totalInterestPaid),
    debtFreeDate,
    monthlyBreakdown,
    debtPayoffOrder,
  };
}

/**
 * Compare payoff strategies
 */
export async function compareStrategies(db: D1Database, userId: string): Promise<{
  strategies: Record<PayoffStrategy, PayoffPlan>;
  recommendation: {
    strategy: PayoffStrategy;
    reason: string;
  };
}> {
  const [snowball, avalanche, highestBalance] = await Promise.all([
    calculatePayoffPlan(db, userId, "snowball"),
    calculatePayoffPlan(db, userId, "avalanche"),
    calculatePayoffPlan(db, userId, "highest_balance"),
  ]);

  // Determine recommendation based on lowest total interest
  const strategies = { snowball, avalanche, highest_balance };
  let recommendation = {
    strategy: "avalanche" as PayoffStrategy,
    reason: "Pays off debt fastest with lowest total interest",
  };

  if (snowball.totalInterestPaid < avalanche.totalInterestPaid) {
    recommendation = {
      strategy: "snowball",
      reason: "Lowest total interest paid (rare, but possible with your debt distribution)",
    };
  } else if (avalanche.monthsToDebtFree < snowball.monthsToDebtFree) {
    recommendation = {
      strategy: "avalanche",
      reason: "Pays off debt fastest with lowest total interest",
    };
  }

  return {
    strategies,
    recommendation,
  };
}
