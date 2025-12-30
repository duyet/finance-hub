/**
 * Amortization Engine
 *
 * Implements reducing balance method for loan amortization calculations.
 *
 * Formula:
 * - I_n = P_{n-1} × (r / 12)
 * - Where:
 *   - I_n is interest for month n
 *   - P_{n-1} is outstanding principal at the end of month n-1
 *   - r is annual interest rate (as percentage)
 */

import { addMonths, differenceInMonths, startOfMonth, isSameMonth } from "~/lib/utils/date";

// ============================================================================
// Type Definitions
// ============================================================================

export interface LoanConfig {
  principal_original: number;
  start_date: Date;
  term_months: number;
  interest_calculation_method: "FLAT" | "REDUCING_BALANCE";
  payment_day_of_month?: number;
}

export interface RateEvent {
  id?: string;
  loan_id?: string;
  effective_date: Date;
  rate_percentage: number;
  rate_type: "FIXED" | "FLOATING" | "TEASER";
  base_rate?: string;
  margin_percentage?: number;
  reason?: string;
}

export interface Installment {
  id?: string;
  loan_id?: string;
  due_date: Date;
  installment_number: number;
  principal_opening: number;
  principal_component: number;
  interest_component: number;
  total_amount: number;
  principal_closing: number;
  status: "ESTIMATED" | "DUE" | "PAID" | "OVERDUE" | "WAIVED";
  paid_date?: Date;
  paid_amount?: number;
  prepayment_amount?: number;
  late_fee?: number;
  notes?: string;
}

export interface LoanSummary {
  total_principal_paid: number;
  total_interest_paid: number;
  total_paid: number;
  remaining_principal: number;
  remaining_payments: number;
  next_payment_date: Date | null;
  next_payment_amount: number;
  total_interest_projected: number;
  total_payment_projected: number;
}

// ============================================================================
// Core Amortization Calculations
// ============================================================================

/**
 * Calculate monthly interest using reducing balance method
 *
 * Formula: I = P × (r / 12)
 * Where:
 *   - I = monthly interest
 *   - P = outstanding principal
 *   - r = annual interest rate (as percentage, e.g., 5.5 for 5.5%)
 *
 * @param outstandingPrincipal - The principal balance at the start of the period
 * @param annualRate - Annual interest rate as a percentage (e.g., 5.5 for 5.5%)
 * @returns Monthly interest amount
 */
export function calculateInterest(
  outstandingPrincipal: number,
  annualRate: number
): number {
  if (outstandingPrincipal <= 0 || annualRate <= 0) {
    return 0;
  }

  // Formula: I = P × (r / 12 / 100)
  // Convert percentage to decimal and divide by 12 for monthly rate
  const monthlyRate = annualRate / 100 / 12;
  return outstandingPrincipal * monthlyRate;
}

/**
 * Calculate EMI (Equated Monthly Installment) using reducing balance method
 *
 * Formula: EMI = P × r × (1 + r)^n / [(1 + r)^n - 1]
 * Where:
 *   - P = principal loan amount
 *   - r = monthly interest rate (annual rate / 12 / 100)
 *   - n = loan tenure in months
 *
 * @param principal - Loan principal amount
 * @param annualRate - Annual interest rate as a percentage
 * @param termMonths - Loan term in months
 * @returns Monthly EMI amount
 */
export function calculateEMI(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  if (principal <= 0 || annualRate <= 0 || termMonths <= 0) {
    return 0;
  }

  const monthlyRate = annualRate / 100 / 12;

  // EMI = P × r × (1 + r)^n / [(1 + r)^n - 1]
  const emi =
    (principal *
      monthlyRate *
      Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);

  return emi;
}

/**
 * Get the applicable interest rate for a specific date
 *
 * @param rateEvents - Array of rate events ordered by effective_date
 * @param date - The date to check
 * @returns The applicable rate or null if no rates are defined
 */
export function getApplicableRate(
  rateEvents: RateEvent[],
  date: Date
): RateEvent | null {
  if (rateEvents.length === 0) {
    return null;
  }

  // Find the most recent rate event on or before the given date
  let applicableRate: RateEvent | null = null;

  for (const event of rateEvents) {
    const effectiveDate = new Date(event.effective_date);
    if (effectiveDate <= date) {
      applicableRate = event;
    } else {
      break;
    }
  }

  return applicableRate;
}

/**
 * Generate complete amortization schedule for a loan
 *
 * @param loan - Loan configuration
 * @param rateEvents - Array of interest rate events (must be sorted by effective_date)
 * @returns Array of installments representing the complete schedule
 */
export function calculateAmortizationSchedule(
  loan: LoanConfig,
  rateEvents: RateEvent[]
): Installment[] {
  const installments: Installment[] = [];
  const {
    principal_original,
    start_date,
    term_months,
    interest_calculation_method,
  } = loan;

  // Validate inputs
  if (principal_original <= 0 || term_months <= 0) {
    throw new Error("Invalid loan parameters: principal and term must be positive");
  }

  if (rateEvents.length === 0) {
    throw new Error("At least one rate event is required");
  }

  // Sort rate events by effective date
  const sortedRateEvents = [...rateEvents].sort(
    (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
  );

  // Initialize calculation variables
  let outstandingPrincipal = principal_original;
  let currentDate = startOfMonth(start_date);

  // Calculate EMI based on initial rate
  const initialRate = sortedRateEvents[0].rate_percentage;
  const emi = calculateEMI(principal_original, initialRate, term_months);

  // Generate installment schedule
  for (let month = 1; month <= term_months; month++) {
    // Get applicable rate for this month
    const applicableRate = getApplicableRate(sortedRateEvents, currentDate);

    if (!applicableRate) {
      throw new Error(`No applicable rate found for date ${currentDate.toISOString()}`);
    }

    const annualRate = applicableRate.rate_percentage;

    // Calculate interest for this month (Reducing Balance)
    // I_n = P_{n-1} × (r / 12)
    const interestComponent = calculateInterest(outstandingPrincipal, annualRate);

    // Calculate principal component
    // For fixed EMI: Principal = EMI - Interest
    let principalComponent: number;

    if (interest_calculation_method === "REDUCING_BALANCE") {
      // Standard EMI calculation
      principalComponent = emi - interestComponent;

      // Handle last installment - ensure we don't overpay
      if (month === term_months) {
        principalComponent = outstandingPrincipal;
      }

      // Ensure principal component doesn't exceed outstanding balance
      if (principalComponent > outstandingPrincipal) {
        principalComponent = outstandingPrincipal;
      }
    } else {
      // FLAT rate method (simple interest)
      // Total interest = P × r × n / 12
      // Monthly payment = (P + Total Interest) / n
      const totalInterest = (principal_original * annualRate * term_months) / (12 * 100);
      const flatPayment = (principal_original + totalInterest) / term_months;
      const flatInterest = totalInterest / term_months;

      // Reassign with let instead of const
      principalComponent = flatPayment - flatInterest;

      // Adjust last installment
      if (month === term_months) {
        principalComponent = outstandingPrincipal;
      }
    }

    // Calculate total payment
    const totalAmount = principalComponent + interestComponent;

    // Calculate closing principal balance
    const principalClosing = outstandingPrincipal - principalComponent;

    // Create installment
    installments.push({
      due_date: new Date(currentDate),
      installment_number: month,
      principal_opening: Math.round(outstandingPrincipal * 100) / 100,
      principal_component: Math.round(principalComponent * 100) / 100,
      interest_component: Math.round(interestComponent * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      principal_closing: Math.max(0, Math.round(principalClosing * 100) / 100),
      status: "ESTIMATED",
    });

    // Update outstanding principal for next iteration
    outstandingPrincipal = Math.max(0, principalClosing);

    // Move to next month
    currentDate = addMonths(currentDate, 1);
  }

  return installments;
}

/**
 * Recalculate amortization schedule after a rate change
 *
 * This function recalculates all future installments from the effective date
 * of the rate change, preserving historical payment data.
 *
 * @param loanId - Loan ID
 * @param effectiveDate - Date when new rate takes effect
 * @param newRate - New annual interest rate as percentage
 * @param remainingPrincipalAtDate - Outstanding principal balance on effective date
 * @param originalInstallments - Original installment array (for historical data)
 * @param remainingTermMonths - Number of months remaining
 * @returns Array of recalculated installments
 */
export function recalculateAfterRateChange(
  loanId: string,
  effectiveDate: Date,
  newRate: number,
  remainingPrincipalAtDate: number,
  originalInstallments: Installment[],
  remainingTermMonths: number
): Installment[] {
  // Separate historical and future installments
  const effectiveDateMonth = startOfMonth(effectiveDate);

  const historicalInstallments = originalInstallments.filter((inst) => {
    const instDate = startOfMonth(new Date(inst.due_date));
    return instDate < effectiveDateMonth || (instDate.getTime() === effectiveDateMonth.getTime() && inst.status === "PAID");
  });

  // Calculate new EMI based on remaining principal and new rate
  const newEMI = calculateEMI(remainingPrincipalAtDate, newRate, remainingTermMonths);

  // Generate new schedule for remaining months
  const newInstallments: Installment[] = [];
  let outstandingPrincipal = remainingPrincipalAtDate;
  let currentDate = effectiveDateMonth;

  // Find starting installment number
  const startNumber = historicalInstallments.length > 0
    ? Math.max(...historicalInstallments.map((i) => i.installment_number))
    : 0;

  for (let month = 1; month <= remainingTermMonths; month++) {
    // Calculate interest using new rate
    const interestComponent = calculateInterest(outstandingPrincipal, newRate);

    // Calculate principal component
    let principalComponent = newEMI - interestComponent;

    // Handle last installment
    if (month === remainingTermMonths) {
      principalComponent = outstandingPrincipal;
    }

    // Ensure principal doesn't exceed outstanding balance
    if (principalComponent > outstandingPrincipal) {
      principalComponent = outstandingPrincipal;
    }

    const totalAmount = principalComponent + interestComponent;
    const principalClosing = outstandingPrincipal - principalComponent;

    // Check if this installment exists in original schedule
    const originalInst = originalInstallments.find(
      (i) => i.installment_number === startNumber + month
    );

    newInstallments.push({
      id: originalInst?.id,
      loan_id: loanId,
      due_date: new Date(currentDate),
      installment_number: startNumber + month,
      principal_opening: Math.round(outstandingPrincipal * 100) / 100,
      principal_component: Math.round(principalComponent * 100) / 100,
      interest_component: Math.round(interestComponent * 100) / 100,
      total_amount: Math.round(totalAmount * 100) / 100,
      principal_closing: Math.max(0, Math.round(principalClosing * 100) / 100),
      status: originalInst?.status || "ESTIMATED",
      paid_date: originalInst?.paid_date,
      paid_amount: originalInst?.paid_amount,
    });

    outstandingPrincipal = Math.max(0, principalClosing);
    currentDate = addMonths(currentDate, 1);
  }

  // Combine historical and new installments
  return [...historicalInstallments, ...newInstallments];
}

/**
 * Calculate loan summary statistics
 *
 * @param installments - Array of all installments
 * @param originalPrincipal - Original loan principal
 * @returns Loan summary object
 */
export function calculateLoanSummary(
  installments: Installment[],
  originalPrincipal: number
): LoanSummary {
  const paidInstallments = installments.filter((i) => i.status === "PAID");
  const pendingInstallments = installments.filter((i) => i.status !== "PAID");

  const totalPrincipalPaid = paidInstallments.reduce(
    (sum, i) => sum + i.principal_component,
    0
  );
  const totalInterestPaid = paidInstallments.reduce(
    (sum, i) => sum + i.interest_component,
    0
  );

  const remainingPrincipal = pendingInstallments.length > 0
    ? pendingInstallments[0].principal_opening
    : 0;

  const nextInstallment = pendingInstallments.find((i) => i.status === "DUE" || i.status === "ESTIMATED");

  const totalInterestProject = installments.reduce(
    (sum, i) => sum + i.interest_component,
    0
  );
  const totalPaymentProject = installments.reduce(
    (sum, i) => sum + i.total_amount,
    0
  );

  return {
    total_principal_paid: Math.round(totalPrincipalPaid * 100) / 100,
    total_interest_paid: Math.round(totalInterestPaid * 100) / 100,
    total_paid: Math.round((totalPrincipalPaid + totalInterestPaid) * 100) / 100,
    remaining_principal: Math.round(remainingPrincipal * 100) / 100,
    remaining_payments: pendingInstallments.length,
    next_payment_date: nextInstallment ? new Date(nextInstallment.due_date) : null,
    next_payment_amount: nextInstallment ? nextInstallment.total_amount : 0,
    total_interest_projected: Math.round(totalInterestProject * 100) / 100,
    total_payment_projected: Math.round(totalPaymentProject * 100) / 100,
  };
}

/**
 * Validate amortization schedule
 *
 * Checks that the schedule is mathematically valid:
 * - Opening principal - Closing principal = Principal component
 * - Principal component + Interest component = Total amount
 * - Final closing balance is approximately zero
 *
 * @param installments - Array of installments to validate
 * @returns Object with validation result and any errors found
 */
export function validateSchedule(installments: Installment[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const tolerance = 0.01; // Allow 1 cent rounding differences

  for (let i = 0; i < installments.length; i++) {
    const inst = installments[i];

    // Check: Principal + Interest = Total
    const calculatedTotal = inst.principal_component + inst.interest_component;
    if (Math.abs(calculatedTotal - inst.total_amount) > tolerance) {
      errors.push(
        `Installment ${inst.installment_number}: Principal + Interest (${calculatedTotal.toFixed(2)}) ` +
        `!= Total (${inst.total_amount.toFixed(2)})`
      );
    }

    // Check: Opening - Closing = Principal (except for prepayments)
    const calculatedPrincipal = inst.principal_opening - inst.principal_closing;
    if (Math.abs(calculatedPrincipal - inst.principal_component) > tolerance) {
      errors.push(
        `Installment ${inst.installment_number}: Opening - Closing (${calculatedPrincipal.toFixed(2)}) ` +
        `!= Principal component (${inst.principal_component.toFixed(2)})`
      );
    }
  }

  // Check final balance
  const lastInstallment = installments[installments.length - 1];
  if (lastInstallment && Math.abs(lastInstallment.principal_closing) > tolerance) {
    errors.push(
      `Final closing balance is not zero: ${lastInstallment.principal_closing.toFixed(2)}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate weighted average interest rate across multiple loans
 *
 * @param loans - Array of loans with outstanding principal and current rate
 * @returns Weighted average interest rate
 */
export function calculateWeightedAverageRate(
  loans: Array<{ principal_outstanding: number; current_interest_rate: number }>
): number {
  if (loans.length === 0) {
    return 0;
  }

  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principal_outstanding, 0);

  if (totalPrincipal === 0) {
    return 0;
  }

  const weightedSum = loans.reduce(
    (sum, loan) => sum + loan.principal_outstanding * loan.current_interest_rate,
    0
  );

  return Math.round((weightedSum / totalPrincipal) * 100) / 100;
}
