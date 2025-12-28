/**
 * Billing Cycle Engine
 *
 * Calculates billing cycles, statement dates, and due dates for credit cards
 * based on the PRD specifications.
 */

export interface BillingCycleConfig {
  statement_day: number; // e.g., 25 (day of month)
  payment_due_day_offset: number; // e.g., 20 days after statement date
}

export interface BillingCycle {
  cycleStartDate: Date;
  cycleEndDate: Date;
  statementDate: Date;
  dueDate: Date;
  daysInCycle: number;
  daysUntilDue: number;
  daysUntilStatement: number;
  cycleProgress: number; // 0-100 percentage through current cycle
}

export interface CycleStatus {
  isGracePeriod: boolean;
  isOverdue: boolean;
  daysUntilDue: number;
  urgency: "low" | "medium" | "high" | "urgent";
}

/**
 * Get the billing cycle for a given date
 *
 * Algorithm from PRD:
 * 1. For date D, if Day(D) > statement_day, transaction belongs to cycle ending next month
 * 2. If Day(D) <= statement_day, belongs to cycle ending this month
 * 3. Grace Period: Statement Date S = Month(M), Day(statement_day)
 * 4. Due Date D = S + due_day_offset days
 */
export function getBillingCycle(
  date: Date,
  config: BillingCycleConfig
): BillingCycle {
  const dayOfMonth = date.getDate();
  const statementDay = config.statement_day;

  let cycleEndYear = date.getFullYear();
  let cycleEndMonth = date.getMonth();

  // Determine which billing cycle this date belongs to
  if (dayOfMonth > statementDay) {
    // We're in the cycle that ends NEXT month
    cycleEndMonth += 1;
    if (cycleEndMonth > 11) {
      cycleEndMonth = 0;
      cycleEndYear += 1;
    }
  }
  // If dayOfMonth <= statementDay, we're in the cycle that ends THIS month

  // Statement date is the statement_day of the cycle end month
  const statementDate = new Date(cycleEndYear, cycleEndMonth, Math.min(statementDay, daysInMonth(cycleEndYear, cycleEndMonth)));

  // Due date is statement date + offset days
  const dueDate = calculateDueDate(statementDate, config.payment_due_day_offset);

  // Cycle start date is the day after the previous statement date
  let cycleStartYear = cycleEndYear;
  let cycleStartMonth = cycleEndMonth - 1;
  if (cycleStartMonth < 0) {
    cycleStartMonth = 11;
    cycleStartYear -= 1;
  }
  const cycleStartDate = new Date(cycleStartYear, cycleStartMonth, Math.min(statementDay, daysInMonth(cycleStartYear, cycleStartMonth)) + 1);

  // Adjust cycle start date if it went beyond the month
  const lastMonthDays = daysInMonth(cycleStartYear, cycleStartMonth);
  if (statementDay >= lastMonthDays) {
    cycleStartDate.setDate(1);
  }

  const daysInCycle = Math.ceil((dueDate.getTime() - cycleStartDate.getTime()) / (1000 * 60 * 60 * 24));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const daysUntilDue = Math.ceil((dueDate.getTime() - todayNormalized.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilStatement = Math.ceil((statementDate.getTime() - todayNormalized.getTime()) / (1000 * 60 * 60 * 24));

  const cycleElapsed = todayNormalized.getTime() - cycleStartDate.getTime();
  const cycleTotal = statementDate.getTime() - cycleStartDate.getTime();
  const cycleProgress = Math.max(0, Math.min(100, (cycleElapsed / cycleTotal) * 100));

  return {
    cycleStartDate,
    cycleEndDate: statementDate,
    statementDate,
    dueDate,
    daysInCycle,
    daysUntilDue,
    daysUntilStatement,
    cycleProgress,
  };
}

/**
 * Calculate due date from statement date with offset days
 * Handles weekend adjustment (optional)
 */
export function calculateDueDate(
  statementDate: Date,
  offsetDays: number,
  adjustForWeekend: boolean = false
): Date {
  const dueDate = new Date(statementDate);
  dueDate.setDate(dueDate.getDate() + offsetDays);

  if (adjustForWeekend) {
    // If due date falls on Saturday, move to Monday
    // If due date falls on Sunday, move to Monday
    const dayOfWeek = dueDate.getDay();
    if (dayOfWeek === 0) {
      // Sunday
      dueDate.setDate(dueDate.getDate() + 1);
    } else if (dayOfWeek === 6) {
      // Saturday
      dueDate.setDate(dueDate.getDate() + 2);
    }
  }

  return dueDate;
}

/**
 * Get the current billing cycle for a credit card
 */
export function getCurrentCycle(
  cardId: string,
  config: BillingCycleConfig
): BillingCycle {
  return getBillingCycle(new Date(), config);
}

/**
 * Get cycle status information
 */
export function getCycleStatus(
  dueDate: Date,
  paymentStatus: string
): CycleStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateNormalized = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  const daysUntilDue = Math.ceil((dueDateNormalized.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0 && paymentStatus !== "PAID";
  const isGracePeriod = daysUntilDue >= 0 && paymentStatus === "UNPAID";

  let urgency: "low" | "medium" | "high" | "urgent" = "low";
  if (isOverdue) {
    urgency = "urgent";
  } else if (daysUntilDue <= 3) {
    urgency = "urgent";
  } else if (daysUntilDue <= 7) {
    urgency = "high";
  } else if (daysUntilDue <= 14) {
    urgency = "medium";
  }

  return {
    isGracePeriod,
    isOverdue,
    daysUntilDue,
    urgency,
  };
}

/**
 * Check if payment is overdue
 */
export function isPaymentOverdue(dueDate: Date, paymentStatus: string): boolean {
  if (paymentStatus === "PAID") return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDateNormalized = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  return dueDateNormalized < today;
}

/**
 * Get all statements for a card in date range
 */
export function getStatementsInRange(
  config: BillingCycleConfig,
  startDate: Date,
  endDate: Date
): Array<{ start: Date; end: Date; statement: Date; due: Date }> {
  const statements: Array<{ start: Date; end: Date; statement: Date; due: Date }> = [];

  // Start with the first cycle on or after startDate
  const currentDate = new Date(startDate);
  currentDate.setDate(1); // Start from first of month

  // Find first statement date
  const statementDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    Math.min(config.statement_day, daysInMonth(currentDate.getFullYear(), currentDate.getMonth()))
  );

  if (statementDate < startDate) {
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  // Generate statements until we pass endDate
  while (currentDate <= endDate) {
    const cycleEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      Math.min(config.statement_day, daysInMonth(currentDate.getFullYear(), currentDate.getMonth()))
    );

    // Skip if this statement date is before our start
    if (cycleEnd >= startDate) {
      const dueDate = calculateDueDate(cycleEnd, config.payment_due_day_offset);

      // Calculate cycle start
      const cycleStart = new Date(cycleEnd);
      cycleStart.setMonth(cycleStart.getMonth() - 1);
      cycleStart.setDate(Math.min(config.statement_day, daysInMonth(cycleStart.getFullYear(), cycleStart.getMonth())) + 1);

      statements.push({
        start: cycleStart,
        end: cycleEnd,
        statement: cycleEnd,
        due: dueDate,
      });
    }

    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }

  return statements;
}

/**
 * Get the next billing cycle (future cycle)
 */
export function getNextCycle(currentCycle: BillingCycle): BillingCycle {
  const nextStatementDate = new Date(currentCycle.statementDate);
  nextStatementDate.setMonth(nextStatementDate.getMonth() + 1);

  return {
    cycleStartDate: currentCycle.statementDate,
    cycleEndDate: nextStatementDate,
    statementDate: nextStatementDate,
    dueDate: calculateDueDate(nextStatementDate, Math.round((currentCycle.dueDate.getTime() - currentCycle.statementDate.getTime()) / (1000 * 60 * 60 * 24))),
    daysInCycle: currentCycle.daysInCycle,
    daysUntilDue: 0,
    daysUntilStatement: 0,
    cycleProgress: 0,
  };
}

/**
 * Get the previous billing cycle (past cycle)
 */
export function getPreviousCycle(config: BillingCycleConfig): BillingCycle {
  const today = new Date();
  const prevMonth = new Date(today);
  prevMonth.setMonth(prevMonth.getMonth() - 1);

  return getBillingCycle(prevMonth, config);
}

/**
 * Helper: Get number of days in a month
 */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Validate billing cycle configuration
 */
export function validateBillingCycleConfig(config: BillingCycleConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.statement_day < 1 || config.statement_day > 31) {
    errors.push("Statement day must be between 1 and 31");
  }

  if (config.payment_due_day_offset < 1) {
    errors.push("Payment due day offset must be at least 1 day");
  }

  if (config.payment_due_day_offset > 60) {
    errors.push("Payment due day offset cannot exceed 60 days");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format cycle for display
 */
export function formatCycle(cycle: BillingCycle, locale: string = "en"): {
  cycleStart: string;
  cycleEnd: string;
  statementDate: string;
  dueDate: string;
  daysRemaining: string;
  progressPercent: string;
} {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return {
    cycleStart: formatDate(cycle.cycleStartDate),
    cycleEnd: formatDate(cycle.cycleEndDate),
    statementDate: formatDate(cycle.statementDate),
    dueDate: formatDate(cycle.dueDate),
    daysRemaining: `${cycle.daysUntilDue} ${cycle.daysUntilDue === 1 ? "day" : "days"}`,
    progressPercent: `${Math.round(cycle.cycleProgress)}%`,
  };
}
