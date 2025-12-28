/**
 * Loans Database Layer
 *
 * Handles all database operations for the loan management module including:
 * - Loans CRUD operations
 * - Interest rate events management
 * - Installments schedule management
 * - Payment tracking
 */

import type { D1Database } from "@cloudflare/workers-types";
import { getDb } from "../auth/db.server";
import {
  calculateAmortizationSchedule,
  recalculateAfterRateChange,
  type LoanConfig,
  type RateEvent,
  type Installment,
} from "../services/amortization";

// ============================================================================
// Type Definitions
// ============================================================================

export interface LoanRow {
  account_id: string;
  principal_original: number;
  principal_outstanding: number;
  start_date: string;
  term_months: number;
  interest_calculation_method: "FLAT" | "REDUCING_BALANCE";
  current_interest_rate: number;
  disbursement_date: string | null;
  maturity_date: string | null;
  payment_day_of_month: number | null;
  purpose: string | null;
  collateral_type: string | null;
  lender_name: string | null;
  lender_account_number: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface LoanWithDetails extends LoanRow {
  financial_institution?: string | null;
  account_type?: string | null;
  account_subtype?: string | null;
}

export interface LoanInterestRateRow {
  id: string;
  loan_id: string;
  effective_date: string;
  rate_percentage: number;
  rate_type: "FIXED" | "FLOATING" | "TEASER";
  base_rate: string | null;
  margin_percentage: number | null;
  reason: string | null;
  created_at: string;
}

export interface LoanInstallmentRow {
  id: string;
  loan_id: string;
  due_date: string;
  installment_number: number;
  principal_opening: number;
  principal_component: number;
  interest_component: number;
  total_amount: number;
  principal_closing: number;
  status: "ESTIMATED" | "DUE" | "PAID" | "OVERDUE" | "WAIVED";
  paid_date: string | null;
  paid_amount: number | null;
  prepayment_amount: number | null;
  late_fee: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanPaymentRow {
  id: string;
  loan_id: string;
  installment_id: string | null;
  payment_date: string;
  amount: number;
  principal_portion: number;
  interest_portion: number;
  fee_portion: number | null;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateLoanInput {
  userId: string;
  accountId: string;
  principalOriginal: number;
  startDate: string;
  termMonths: number;
  interestCalculationMethod: "FLAT" | "REDUCING_BALANCE";
  initialRate: number;
  rateType: "FIXED" | "FLOATING" | "TEASER";
  disbursementDate?: string | null;
  maturityDate?: string | null;
  paymentDayOfMonth?: number | null;
  purpose?: string | null;
  collateralType?: string | null;
  lenderName?: string | null;
  lenderAccountNumber?: string | null;
  baseRate?: string | null;
  marginPercentage?: number | null;
  rateReason?: string | null;
}

export interface UpdateLoanInput {
  principalOutstanding?: number;
  currentInterestRate?: number;
  maturityDate?: string | null;
  paymentDayOfMonth?: number | null;
  purpose?: string | null;
  collateralType?: string | null;
  lenderName?: string | null;
  lenderAccountNumber?: string | null;
  isActive?: boolean;
}

export interface AddRateEventInput {
  loanId: string;
  effectiveDate: string;
  ratePercentage: number;
  rateType: "FIXED" | "FLOATING" | "TEASER";
  baseRate?: string | null;
  marginPercentage?: number | null;
  reason?: string | null;
}

export interface RecordPaymentInput {
  loanId: string;
  installmentId?: string | null;
  paymentDate: string;
  amount: number;
  principalPortion: number;
  interestPortion: number;
  feePortion?: number;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Calculate maturity date from start date and term
 */
function calculateMaturityDate(startDate: string, termMonths: number): string {
  const date = new Date(startDate);
  date.setMonth(date.getMonth() + termMonths);
  return date.toISOString().split("T")[0];
}

// ============================================================================
// Loans CRUD Operations
// ============================================================================

export const loanDb = {
  /**
   * Get all loans for a user
   */
  async getAll(db: D1Database, userId: string): Promise<LoanWithDetails[]> {
    const result = await db
      .prepare(`
        SELECT
          l.*,
          fa.financial_institution,
          fa.account_type,
          fa.account_subtype
        FROM loans l
        INNER JOIN financial_accounts fa ON l.account_id = fa.id
        WHERE fa.user_id = ?
        ORDER BY l.start_date DESC
      `)
      .bind(userId)
      .all<LoanWithDetails>();

    return result.results || [];
  },

  /**
   * Get active loans for a user
   */
  async getActive(db: D1Database, userId: string): Promise<LoanWithDetails[]> {
    const result = await db
      .prepare(`
        SELECT
          l.*,
          fa.financial_institution,
          fa.account_type,
          fa.account_subtype
        FROM loans l
        INNER JOIN financial_accounts fa ON l.account_id = fa.id
        WHERE fa.user_id = ? AND l.is_active = 1
        ORDER BY l.start_date DESC
      `)
      .bind(userId)
      .all<LoanWithDetails>();

    return result.results || [];
  },

  /**
   * Get a single loan by ID with user validation
   */
  async getById(
    db: D1Database,
    loanId: string,
    userId: string
  ): Promise<LoanWithDetails | null> {
    const result = await db
      .prepare(`
        SELECT
          l.*,
          fa.financial_institution,
          fa.account_type,
          fa.account_subtype
        FROM loans l
        INNER JOIN financial_accounts fa ON l.account_id = fa.id
        WHERE l.account_id = ? AND fa.user_id = ?
      `)
      .bind(loanId, userId)
      .first<LoanWithDetails>();

    return result || null;
  },

  /**
   * Create a new loan with initial amortization schedule
   */
  async create(db: D1Database, userId: string, data: CreateLoanInput): Promise<LoanWithDetails> {
    // Start a transaction
    // Note: D1 doesn't support transactions natively, so we'll do our best with sequential operations

    // 1. Insert financial account
    const accountId = data.accountId || generateId();

    await db
      .prepare(`
        INSERT INTO financial_accounts (
          id, user_id, financial_institution, account_type, account_subtype,
          is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `)
      .bind(
        accountId,
        userId,
        data.lenderName || "Unknown",
        "LOAN",
        "LOAN"
      )
      .run();

    // 2. Calculate maturity date if not provided
    const maturityDate = data.maturityDate || calculateMaturityDate(data.startDate, data.termMonths);

    // 3. Insert loan
    await db
      .prepare(`
        INSERT INTO loans (
          account_id, principal_original, principal_outstanding, start_date,
          term_months, interest_calculation_method, current_interest_rate,
          disbursement_date, maturity_date, payment_day_of_month, purpose,
          collateral_type, lender_name, lender_account_number, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `)
      .bind(
        accountId,
        data.principalOriginal,
        data.principalOriginal,
        data.startDate,
        data.termMonths,
        data.interestCalculationMethod,
        data.initialRate,
        data.disbursementDate || null,
        maturityDate,
        data.paymentDayOfMonth || null,
        data.purpose || null,
        data.collateralType || null,
        data.lenderName || null,
        data.lenderAccountNumber || null
      )
      .run();

    // 4. Insert initial interest rate event
    const rateEventId = generateId();
    await db
      .prepare(`
        INSERT INTO loan_interest_rates (
          id, loan_id, effective_date, rate_percentage, rate_type,
          base_rate, margin_percentage, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        rateEventId,
        accountId,
        data.startDate,
        data.initialRate,
        data.rateType,
        data.baseRate || null,
        data.marginPercentage || null,
        data.rateReason || null
      )
      .run();

    // 5. Generate amortization schedule
    const loanConfig: LoanConfig = {
      principal_original: data.principalOriginal,
      start_date: new Date(data.startDate),
      term_months: data.termMonths,
      interest_calculation_method: data.interestCalculationMethod,
      payment_day_of_month: data.paymentDayOfMonth ?? undefined,
    };

    const rateEvent: RateEvent = {
      id: rateEventId,
      loan_id: accountId,
      effective_date: new Date(data.startDate),
      rate_percentage: data.initialRate,
      rate_type: data.rateType,
      base_rate: data.baseRate ?? undefined,
      margin_percentage: data.marginPercentage ?? undefined,
      reason: data.rateReason ?? undefined,
    };

    const installments = calculateAmortizationSchedule(loanConfig, [rateEvent]);

    // 6. Bulk insert installments
    for (const installment of installments) {
      const installmentId = generateId();
      await db
        .prepare(`
          INSERT INTO loan_installments (
            id, loan_id, due_date, installment_number, principal_opening,
            principal_component, interest_component, total_amount,
            principal_closing, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          installmentId,
          accountId,
          installment.due_date.toISOString().split("T")[0],
          installment.installment_number,
          installment.principal_opening,
          installment.principal_component,
          installment.interest_component,
          installment.total_amount,
          installment.principal_closing,
          installment.status
        )
        .run();
    }

    // 7. Return created loan
    const loan = await this.getById(db, accountId, userId);

    if (!loan) {
      throw new Error("Failed to create loan");
    }

    return loan;
  },

  /**
   * Update loan details
   */
  async update(
    db: D1Database,
    loanId: string,
    userId: string,
    data: UpdateLoanInput
  ): Promise<LoanWithDetails | null> {
    // Verify loan belongs to user
    const existing = await this.getById(db, loanId, userId);
    if (!existing) {
      return null;
    }

    // Build update query
    const updates: string[] = [];
    const values: (string | number | null)[] = [];

    if (data.principalOutstanding !== undefined) {
      updates.push("principal_outstanding = ?");
      values.push(data.principalOutstanding);
    }
    if (data.currentInterestRate !== undefined) {
      updates.push("current_interest_rate = ?");
      values.push(data.currentInterestRate);
    }
    if (data.maturityDate !== undefined) {
      updates.push("maturity_date = ?");
      values.push(data.maturityDate);
    }
    if (data.paymentDayOfMonth !== undefined) {
      updates.push("payment_day_of_month = ?");
      values.push(data.paymentDayOfMonth);
    }
    if (data.purpose !== undefined) {
      updates.push("purpose = ?");
      values.push(data.purpose);
    }
    if (data.collateralType !== undefined) {
      updates.push("collateral_type = ?");
      values.push(data.collateralType);
    }
    if (data.lenderName !== undefined) {
      updates.push("lender_name = ?");
      values.push(data.lenderName);
    }
    if (data.lenderAccountNumber !== undefined) {
      updates.push("lender_account_number = ?");
      values.push(data.lenderAccountNumber);
    }
    if (data.isActive !== undefined) {
      updates.push("is_active = ?");
      values.push(data.isActive ? 1 : 0);
    }

    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(loanId);

      await db
        .prepare(`UPDATE loans SET ${updates.join(", ")} WHERE account_id = ?`)
        .bind(...values)
        .run();
    }

    return this.getById(db, loanId, userId);
  },

  /**
   * Delete a loan (cascades to installments, rates, payments)
   */
  async delete(
    db: D1Database,
    loanId: string,
    userId: string
  ): Promise<boolean> {
    // Verify loan belongs to user
    const existing = await this.getById(db, loanId, userId);
    if (!existing) {
      return false;
    }

    // Delete financial account (will cascade to loans, installments, rates, payments)
    await db
      .prepare("DELETE FROM financial_accounts WHERE id = ?")
      .bind(loanId)
      .run();

    return true;
  },

  /**
   * Get loan summary statistics
   */
  async getSummary(db: D1Database, userId: string): Promise<{
    totalOutstandingDebt: number;
    totalMonthlyPayments: number;
    weightedAverageRate: number;
    activeLoansCount: number;
  }> {
    const loans = await this.getActive(db, userId);

    const totalOutstandingDebt = loans.reduce(
      (sum, loan) => sum + loan.principal_outstanding,
      0
    );

    // Get total monthly payments from upcoming installments
    const monthlyPaymentsResult = await db
      .prepare(`
        SELECT SUM(li.total_amount) as total_monthly
        FROM loan_installments li
        INNER JOIN loans l ON li.loan_id = l.account_id
        INNER JOIN financial_accounts fa ON l.account_id = fa.id
        WHERE fa.user_id = ?
          AND li.status IN ('ESTIMATED', 'DUE')
          AND li.due_date >= date('now')
          AND li.due_date <= date('now', '+30 days')
      `)
      .bind(userId)
      .first<{ total_monthly: number | null }>();

    const totalMonthlyPayments = monthlyPaymentsResult?.total_monthly || 0;

    // Calculate weighted average rate
    const weightedAverageRate = loans.length > 0
      ? loans.reduce((sum, loan) => sum + loan.principal_outstanding * loan.current_interest_rate, 0) /
        loans.reduce((sum, loan) => sum + loan.principal_outstanding, 0)
      : 0;

    return {
      totalOutstandingDebt: Math.round(totalOutstandingDebt * 100) / 100,
      totalMonthlyPayments: Math.round(totalMonthlyPayments * 100) / 100,
      weightedAverageRate: Math.round(weightedAverageRate * 100) / 100,
      activeLoansCount: loans.length,
    };
  },
};

// ============================================================================
// Interest Rate Events Operations
// ============================================================================

export const rateEventDb = {
  /**
   * Get all rate events for a loan
   */
  async getByLoanId(
    db: D1Database,
    loanId: string,
    userId: string
  ): Promise<LoanInterestRateRow[]> {
    // Verify loan belongs to user
    const loan = await loanDb.getById(db, loanId, userId);
    if (!loan) {
      return [];
    }

    const result = await db
      .prepare(`
        SELECT * FROM loan_interest_rates
        WHERE loan_id = ?
        ORDER BY effective_date DESC
      `)
      .bind(loanId)
      .all<LoanInterestRateRow>();

    return result.results || [];
  },

  /**
   * Add a new rate event and recalculate future installments
   */
  async add(
    db: D1Database,
    loanId: string,
    userId: string,
    data: AddRateEventInput
  ): Promise<LoanInterestRateRow | null> {
    // Verify loan belongs to user
    const loan = await loanDb.getById(db, loanId, userId);
    if (!loan) {
      return null;
    }

    // Check if rate event already exists for this date
    const existing = await db
      .prepare(`
        SELECT id FROM loan_interest_rates
        WHERE loan_id = ? AND effective_date = ?
      `)
      .bind(loanId, data.effectiveDate)
      .first<{ id: string }>();

    if (existing) {
      throw new Error("Rate event already exists for this effective date");
    }

    // Insert new rate event
    const rateEventId = generateId();
    await db
      .prepare(`
        INSERT INTO loan_interest_rates (
          id, loan_id, effective_date, rate_percentage, rate_type,
          base_rate, margin_percentage, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        rateEventId,
        loanId,
        data.effectiveDate,
        data.ratePercentage,
        data.rateType,
        data.baseRate || null,
        data.marginPercentage || null,
        data.reason || null
      )
      .run();

    // Get all existing installments
    const existingInstallments = await installmentDb.getByLoanId(db, loanId, userId);

    // Find the installment on or after the effective date
    const effectiveDate = new Date(data.effectiveDate);
    const affectedInstallments: Array<{
      id: string;
      loan_id: string;
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
    }> = existingInstallments
      .filter((inst) => {
        const instDate = new Date(inst.due_date);
        return instDate >= effectiveDate && inst.status !== "PAID";
      })
      .map((inst) => ({
        id: inst.id,
        loan_id: inst.loan_id,
        due_date: new Date(inst.due_date),
        installment_number: inst.installment_number,
        principal_opening: inst.principal_opening,
        principal_component: inst.principal_component,
        interest_component: inst.interest_component,
        total_amount: inst.total_amount,
        principal_closing: inst.principal_closing,
        status: inst.status,
        paid_date: inst.paid_date ? new Date(inst.paid_date) : undefined,
        paid_amount: inst.paid_amount ?? undefined,
        prepayment_amount: inst.prepayment_amount ?? undefined,
        late_fee: inst.late_fee ?? undefined,
        notes: inst.notes ?? undefined,
      }));

    if (affectedInstallments.length > 0) {
      // Get outstanding principal at effective date
      const outstandingPrincipal = affectedInstallments[0].principal_opening;
      const remainingTerm = affectedInstallments.length;

      // Recalculate future installments
      const recalculated = recalculateAfterRateChange(
        loanId,
        effectiveDate,
        data.ratePercentage,
        outstandingPrincipal,
        affectedInstallments,
        remainingTerm
      );

      // Update affected installments
      for (const inst of recalculated) {
        if (new Date(inst.due_date) >= effectiveDate) {
          await db
            .prepare(`
              UPDATE loan_installments
              SET principal_opening = ?,
                  principal_component = ?,
                  interest_component = ?,
                  total_amount = ?,
                  principal_closing = ?,
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `)
            .bind(
              inst.principal_opening,
              inst.principal_component,
              inst.interest_component,
              inst.total_amount,
              inst.principal_closing,
              inst.id
            )
            .run();
        }
      }
    }

    // Update loan's current interest rate
    await db
      .prepare(`
        UPDATE loans
        SET current_interest_rate = ?, updated_at = CURRENT_TIMESTAMP
        WHERE account_id = ?
      `)
      .bind(data.ratePercentage, loanId)
      .run();

    // Return the created rate event
    const result = await db
      .prepare("SELECT * FROM loan_interest_rates WHERE id = ?")
      .bind(rateEventId)
      .first<LoanInterestRateRow>();

    return result || null;
  },

  /**
   * Delete a rate event
   */
  async delete(
    db: D1Database,
    rateEventId: string,
    userId: string
  ): Promise<boolean> {
    // Verify rate event belongs to user's loan
    const result = await db
      .prepare(`
        SELECT lir.loan_id
        FROM loan_interest_rates lir
        INNER JOIN loans l ON lir.loan_id = l.account_id
        INNER JOIN financial_accounts fa ON l.account_id = fa.id
        WHERE lir.id = ? AND fa.user_id = ?
      `)
      .bind(rateEventId, userId)
      .first<{ loan_id: string }>();

    if (!result) {
      return false;
    }

    await db
      .prepare("DELETE FROM loan_interest_rates WHERE id = ?")
      .bind(rateEventId)
      .run();

    return true;
  },
};

// ============================================================================
// Installments Operations
// ============================================================================

export const installmentDb = {
  /**
   * Get all installments for a loan
   */
  async getByLoanId(
    db: D1Database,
    loanId: string,
    userId: string
  ): Promise<LoanInstallmentRow[]> {
    // Verify loan belongs to user
    const loan = await loanDb.getById(db, loanId, userId);
    if (!loan) {
      return [];
    }

    const result = await db
      .prepare(`
        SELECT * FROM loan_installments
        WHERE loan_id = ?
        ORDER BY installment_number ASC
      `)
      .bind(loanId)
      .all<LoanInstallmentRow>();

    return result.results || [];
  },

  /**
   * Get upcoming installments for a user
   */
  async getUpcoming(
    db: D1Database,
    userId: string,
    days: number = 30
  ): Promise<Array<LoanInstallmentRow & { loan_name: string }>> {
    const result = await db
      .prepare(`
        SELECT
          li.*,
          fa.financial_institution || ' - ' || fa.account_type as loan_name
        FROM loan_installments li
        INNER JOIN loans l ON li.loan_id = l.account_id
        INNER JOIN financial_accounts fa ON l.account_id = fa.id
        WHERE fa.user_id = ?
          AND li.status IN ('ESTIMATED', 'DUE')
          AND li.due_date >= date('now')
          AND li.due_date <= date('now', '+' || ? || ' days')
        ORDER BY li.due_date ASC
      `)
      .bind(userId, days)
      .all<LoanInstallmentRow & { loan_name: string }>();

    return result.results || [];
  },

  /**
   * Get overdue installments for a user
   */
  async getOverdue(
    db: D1Database,
    userId: string
  ): Promise<Array<LoanInstallmentRow & { loan_name: string }>> {
    const result = await db
      .prepare(`
        SELECT
          li.*,
          fa.financial_institution || ' - ' || fa.account_type as loan_name
        FROM loan_installments li
        INNER JOIN loans l ON li.loan_id = l.account_id
        INNER JOIN financial_accounts fa ON l.account_id = fa.id
        WHERE fa.user_id = ?
          AND li.status = 'OVERDUE'
        ORDER BY li.due_date ASC
      `)
      .bind(userId)
      .all<LoanInstallmentRow & { loan_name: string }>();

    return result.results || [];
  },

  /**
   * Update installment status
   */
  async updateStatus(
    db: D1Database,
    installmentId: string,
    userId: string,
    status: "ESTIMATED" | "DUE" | "PAID" | "OVERDUE" | "WAIVED",
    paidDate?: string | null,
    paidAmount?: number | null
  ): Promise<LoanInstallmentRow | null> {
    // Verify installment belongs to user's loan
    const existing = await db
      .prepare(`
        SELECT li.loan_id
        FROM loan_installments li
        INNER JOIN loans l ON li.loan_id = l.account_id
        INNER JOIN financial_accounts fa ON l.account_id = fa.id
        WHERE li.id = ? AND fa.user_id = ?
      `)
      .bind(installmentId, userId)
      .first<{ loan_id: string }>();

    if (!existing) {
      return null;
    }

    // Update installment
    await db
      .prepare(`
        UPDATE loan_installments
        SET status = ?,
            paid_date = ?,
            paid_amount = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .bind(status, paidDate || null, paidAmount || null, installmentId)
      .run();

    // If paid, update loan's outstanding principal
    if (status === "PAID") {
      const installment = await db
        .prepare("SELECT principal_closing FROM loan_installments WHERE id = ?")
        .bind(installmentId)
        .first<{ principal_closing: number }>();

      if (installment) {
        await db
          .prepare(`
            UPDATE loans
            SET principal_outstanding = ?, updated_at = CURRENT_TIMESTAMP
            WHERE account_id = ?
          `)
          .bind(installment.principal_closing, existing.loan_id)
          .run();
      }
    }

    // Return updated installment
    const result = await db
      .prepare("SELECT * FROM loan_installments WHERE id = ?")
      .bind(installmentId)
      .first<LoanInstallmentRow>();

    return result || null;
  },
};

// ============================================================================
// Payments Operations
// ============================================================================

export const paymentDb = {
  /**
   * Get payment history for a loan
   */
  async getByLoanId(
    db: D1Database,
    loanId: string,
    userId: string
  ): Promise<LoanPaymentRow[]> {
    // Verify loan belongs to user
    const loan = await loanDb.getById(db, loanId, userId);
    if (!loan) {
      return [];
    }

    const result = await db
      .prepare(`
        SELECT * FROM loan_payments
        WHERE loan_id = ?
        ORDER BY payment_date DESC
      `)
      .bind(loanId)
      .all<LoanPaymentRow>();

    return result.results || [];
  },

  /**
   * Get all payments for a user
   */
  async getAllForUser(db: D1Database, userId: string): Promise<
    Array<LoanPaymentRow & { loan_name: string }>
  > {
    const result = await db
      .prepare(`
        SELECT
          lp.*,
          fa.financial_institution || ' - ' || fa.account_type as loan_name
        FROM loan_payments lp
        INNER JOIN loans l ON lp.loan_id = l.account_id
        INNER JOIN financial_accounts fa ON l.account_id = fa.id
        WHERE fa.user_id = ?
        ORDER BY lp.payment_date DESC
      `)
      .bind(userId)
      .all<LoanPaymentRow & { loan_name: string }>();

    return result.results || [];
  },

  /**
   * Record a payment
   */
  async create(
    db: D1Database,
    userId: string,
    data: RecordPaymentInput
  ): Promise<LoanPaymentRow | null> {
    // Verify loan belongs to user
    const loan = await loanDb.getById(db, data.loanId, userId);
    if (!loan) {
      return null;
    }

    // If installment_id is provided, verify it belongs to the loan
    if (data.installmentId) {
      const installment = await db
        .prepare(`
          SELECT id FROM loan_installments
          WHERE id = ? AND loan_id = ?
        `)
        .bind(data.installmentId, data.loanId)
        .first<{ id: string }>();

      if (!installment) {
        throw new Error("Installment does not belong to this loan");
      }
    }

    // Insert payment
    const paymentId = generateId();
    await db
      .prepare(`
        INSERT INTO loan_payments (
          id, loan_id, installment_id, payment_date, amount,
          principal_portion, interest_portion, fee_portion,
          payment_method, reference_number, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        paymentId,
        data.loanId,
        data.installmentId || null,
        data.paymentDate,
        data.amount,
        data.principalPortion,
        data.interestPortion,
        data.feePortion || null,
        data.paymentMethod || null,
        data.referenceNumber || null,
        data.notes || null
      )
      .run();

    // If installment_id is provided, update installment status
    if (data.installmentId) {
      await installmentDb.updateStatus(
        db,
        data.installmentId,
        userId,
        "PAID",
        data.paymentDate,
        data.amount
      );
    }

    // Return created payment
    const result = await db
      .prepare("SELECT * FROM loan_payments WHERE id = ?")
      .bind(paymentId)
      .first<LoanPaymentRow>();

    return result || null;
  },

  /**
   * Get payment by ID
   */
  async getById(
    db: D1Database,
    paymentId: string,
    userId: string
  ): Promise<LoanPaymentRow | null> {
    const result = await db
      .prepare(`
        SELECT lp.*
        FROM loan_payments lp
        INNER JOIN loans l ON lp.loan_id = l.account_id
        INNER JOIN financial_accounts fa ON l.account_id = fa.id
        WHERE lp.id = ? AND fa.user_id = ?
      `)
      .bind(paymentId, userId)
      .first<LoanPaymentRow>();

    return result || null;
  },
};

// ============================================================================
// Combined Queries for Detail Pages
// ============================================================================

/**
 * Get complete loan data including rates, installments, and payments
 */
export async function getLoanWithDetails(
  request: Request,
  loanId: string,
  userId: string
): Promise<{
  loan: LoanWithDetails | null;
  rateEvents: LoanInterestRateRow[];
  installments: LoanInstallmentRow[];
  payments: LoanPaymentRow[];
}> {
  const db = getDb(request);

  const [loan, rateEvents, installments, payments] = await Promise.all([
    loanDb.getById(db, loanId, userId),
    rateEventDb.getByLoanId(db, loanId, userId),
    installmentDb.getByLoanId(db, loanId, userId),
    paymentDb.getByLoanId(db, loanId, userId),
  ]);

  return {
    loan,
    rateEvents,
    installments,
    payments,
  };
}
