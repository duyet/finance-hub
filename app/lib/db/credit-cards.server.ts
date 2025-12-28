/**
 * Credit Card Database Operations
 *
 * Handles all credit card CRUD operations, statement management, and billing cycle queries.
 */

import type { D1Database } from "@cloudflare/workers-types";
import { getDb } from "../auth/db.server";
import { getBillingCycle, getCycleStatus } from "../services/billing-cycle";

// ============================================================================
// Type Definitions
// ============================================================================

export interface CreditCardRow {
  id: string;
  user_id: string;
  name: string;
  type: string;
  currency: string;
  current_balance: number;
  institution_name: string | null;
  account_number_last4: string | null;
  color_theme: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

export interface CreditCardConfigRow {
  account_id: string;
  statement_day: number;
  payment_due_day_offset: number;
  credit_limit: number;
  apr: number | null;
  annual_fee: number;
  grace_period_days: number;
  interest_free_period_days: number;
  created_at: string;
  updated_at: string;
}

export interface CreditCardStatementRow {
  id: string;
  account_id: string;
  cycle_start_date: string;
  cycle_end_date: string;
  statement_date: string;
  due_date: string;
  opening_balance: number;
  closing_balance: number;
  total_charges: number;
  total_payments: number;
  total_fees: number;
  minimum_payment: number | null;
  payment_status: string;
  amount_paid: number;
  paid_at: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditCardWithConfig {
  id: string;
  user_id: string;
  name: string;
  type: string;
  currency: string;
  current_balance: number;
  institution_name: string | null;
  account_number_last4: string | null;
  color_theme: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
  config: {
    statement_day: number;
    payment_due_day_offset: number;
    credit_limit: number;
    apr: number | null;
    annual_fee: number;
    grace_period_days: number;
    interest_free_period_days: number;
  };
}

export interface StatementWithStatus extends CreditCardStatementRow {
  utilization: number;
  available_credit: number;
  is_overdue: boolean;
  days_until_due: number;
  urgency: "low" | "medium" | "high" | "urgent";
}

export interface CurrentCycleInfo {
  card_id: string;
  cycle_start_date: Date;
  cycle_end_date: Date;
  statement_date: Date;
  due_date: Date;
  days_until_due: number;
  days_until_statement: number;
  cycle_progress: number;
  current_balance: number;
  available_credit: number;
  credit_limit: number;
  utilization_percent: number;
  minimum_payment: number;
  payment_status: string;
  is_overdue: boolean;
  urgency: "low" | "medium" | "high" | "urgent";
}

// ============================================================================
// Credit Card CRUD Operations
// ============================================================================

export const creditCardDb = {
  /**
   * Get all credit cards for a user
   */
  async getAll(db: D1Database, userId: string): Promise<CreditCardWithConfig[]> {
    const result = await db
      .prepare(`
        SELECT
          fa.*,
          cc.statement_day,
          cc.payment_due_day_offset,
          cc.credit_limit,
          cc.apr,
          cc.annual_fee,
          cc.grace_period_days,
          cc.interest_free_period_days
        FROM financial_accounts fa
        INNER JOIN credit_card_configs cc ON fa.id = cc.account_id
        WHERE fa.user_id = ?
          AND fa.type = 'CREDIT_CARD'
          AND fa.is_archived = 0
        ORDER BY fa.created_at DESC
      `)
      .bind(userId)
      .all<CreditCardRow & CreditCardConfigRow>();

    return result.results.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      type: row.type,
      currency: row.currency,
      current_balance: row.current_balance,
      institution_name: row.institution_name,
      account_number_last4: row.account_number_last4,
      color_theme: row.color_theme,
      is_archived: row.is_archived,
      created_at: row.created_at,
      updated_at: row.updated_at,
      config: {
        statement_day: row.statement_day,
        payment_due_day_offset: row.payment_due_day_offset,
        credit_limit: row.credit_limit,
        apr: row.apr,
        annual_fee: row.annual_fee,
        grace_period_days: row.grace_period_days,
        interest_free_period_days: row.interest_free_period_days,
      },
    }));
  },

  /**
   * Get a single credit card by ID
   */
  async getById(db: D1Database, cardId: string, userId: string): Promise<CreditCardWithConfig | null> {
    const result = await db
      .prepare(`
        SELECT
          fa.*,
          cc.statement_day,
          cc.payment_due_day_offset,
          cc.credit_limit,
          cc.apr,
          cc.annual_fee,
          cc.grace_period_days,
          cc.interest_free_period_days
        FROM financial_accounts fa
        INNER JOIN credit_card_configs cc ON fa.id = cc.account_id
        WHERE fa.id = ?
          AND fa.user_id = ?
          AND fa.type = 'CREDIT_CARD'
      `)
      .bind(cardId, userId)
      .first<CreditCardRow & CreditCardConfigRow>();

    if (!result) return null;

    return {
      id: result.id,
      user_id: result.user_id,
      name: result.name,
      type: result.type,
      currency: result.currency,
      current_balance: result.current_balance,
      institution_name: result.institution_name,
      account_number_last4: result.account_number_last4,
      color_theme: result.color_theme,
      is_archived: result.is_archived,
      created_at: result.created_at,
      updated_at: result.updated_at,
      config: {
        statement_day: result.statement_day,
        payment_due_day_offset: result.payment_due_day_offset,
        credit_limit: result.credit_limit,
        apr: result.apr,
        annual_fee: result.annual_fee,
        grace_period_days: result.grace_period_days,
        interest_free_period_days: result.interest_free_period_days,
      },
    };
  },

  /**
   * Create a new credit card
   */
  async create(
    db: D1Database,
    userId: string,
    data: {
      name: string;
      institution_name?: string;
      account_number_last4?: string;
      currency?: string;
      color_theme?: string;
      statement_day: number;
      payment_due_day_offset: number;
      credit_limit: number;
      apr?: number;
      annual_fee?: number;
      grace_period_days?: number;
      interest_free_period_days?: number;
    }
  ): Promise<CreditCardWithConfig> {
    const accountId = crypto.randomUUID();

    // Create financial account
    await db
      .prepare(`
        INSERT INTO financial_accounts (
          id, user_id, name, type, currency,
          institution_name, account_number_last4, color_theme,
          current_balance, is_archived
        )
        VALUES (?, ?, ?, 'CREDIT_CARD', ?, ?, ?, ?, 0, 0)
      `)
      .bind(
        accountId,
        userId,
        data.name,
        data.currency || "VND",
        data.institution_name || null,
        data.account_number_last4 || null,
        data.color_theme || null
      )
      .run();

    // Create credit card config
    await db
      .prepare(`
        INSERT INTO credit_card_configs (
          account_id, statement_day, payment_due_day_offset,
          credit_limit, apr, annual_fee, grace_period_days,
          interest_free_period_days
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        accountId,
        data.statement_day,
        data.payment_due_day_offset,
        data.credit_limit,
        data.apr || null,
        data.annual_fee || 0,
        data.grace_period_days || 21,
        data.interest_free_period_days || 45
      )
      .run();

    return creditCardDb.getById(db, accountId, userId) as Promise<CreditCardWithConfig>;
  },

  /**
   * Update a credit card
   */
  async update(
    db: D1Database,
    cardId: string,
    userId: string,
    data: {
      name?: string;
      institution_name?: string;
      account_number_last4?: string;
      color_theme?: string;
      current_balance?: number;
      credit_limit?: number;
      apr?: number;
      annual_fee?: number;
      statement_day?: number;
      payment_due_day_offset?: number;
    }
  ): Promise<CreditCardWithConfig | null> {
    // Update financial account
    const accountUpdates: string[] = [];
    const accountValues: (string | number)[] = [];

    if (data.name !== undefined) {
      accountUpdates.push("name = ?");
      accountValues.push(data.name);
    }
    if (data.institution_name !== undefined) {
      accountUpdates.push("institution_name = ?");
      accountValues.push(data.institution_name);
    }
    if (data.account_number_last4 !== undefined) {
      accountUpdates.push("account_number_last4 = ?");
      accountValues.push(data.account_number_last4);
    }
    if (data.color_theme !== undefined) {
      accountUpdates.push("color_theme = ?");
      accountValues.push(data.color_theme);
    }
    if (data.current_balance !== undefined) {
      accountUpdates.push("current_balance = ?");
      accountValues.push(data.current_balance);
    }

    if (accountUpdates.length > 0) {
      accountUpdates.push("updated_at = CURRENT_TIMESTAMP");
      accountValues.push(cardId, userId);

      await db
        .prepare(`
          UPDATE financial_accounts
          SET ${accountUpdates.join(", ")}
          WHERE id = ? AND user_id = ?
        `)
        .bind(...accountValues)
        .run();
    }

    // Update credit card config
    const configUpdates: string[] = [];
    const configValues: (string | number)[] = [];

    if (data.credit_limit !== undefined) {
      configUpdates.push("credit_limit = ?");
      configValues.push(data.credit_limit);
    }
    if (data.apr !== undefined) {
      configUpdates.push("apr = ?");
      configValues.push(data.apr);
    }
    if (data.statement_day !== undefined) {
      configUpdates.push("statement_day = ?");
      configValues.push(data.statement_day);
    }
    if (data.payment_due_day_offset !== undefined) {
      configUpdates.push("payment_due_day_offset = ?");
      configValues.push(data.payment_due_day_offset);
    }

    if (configUpdates.length > 0) {
      configUpdates.push("updated_at = CURRENT_TIMESTAMP");
      configValues.push(cardId);

      await db
        .prepare(`
          UPDATE credit_card_configs
          SET ${configUpdates.join(", ")}
          WHERE account_id = ?
        `)
        .bind(...configValues)
        .run();
    }

    return creditCardDb.getById(db, cardId, userId);
  },

  /**
   * Archive (soft delete) a credit card
   */
  async archive(db: D1Database, cardId: string, userId: string): Promise<boolean> {
    const result = await db
      .prepare(`
        UPDATE financial_accounts
        SET is_archived = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `)
      .bind(cardId, userId)
      .run();

    return result.meta.changes > 0;
  },

  /**
   * Delete a credit card permanently
   */
  async delete(db: D1Database, cardId: string, userId: string): Promise<boolean> {
    const result = await db
      .prepare(`
        DELETE FROM financial_accounts
        WHERE id = ? AND user_id = ?
      `)
      .bind(cardId, userId)
      .run();

    return result.meta.changes > 0;
  },
};

// ============================================================================
// Statement Operations
// ============================================================================

export interface CreditCardTransaction {
  date: Date;
  description: string;
  amount: number;
  categoryName?: string;
  status: string;
}

export const statementDb = {
  /**
   * Get all statements for a credit card
   */
  async getAll(db: D1Database, cardId: string, userId: string): Promise<StatementWithStatus[]> {
    const card = await creditCardDb.getById(db, cardId, userId);
    if (!card) return [];

    const result = await db
      .prepare(`
        SELECT * FROM credit_card_statements
        WHERE account_id = ?
        ORDER BY statement_date DESC
      `)
      .bind(cardId)
      .all<CreditCardStatementRow>();

    return result.results.map((row) => {
      const dueDate = new Date(row.due_date);
      const status = getCycleStatus(dueDate, row.payment_status);
      const availableCredit = card.config.credit_limit - row.closing_balance;
      const utilization = (row.closing_balance / card.config.credit_limit) * 100;

      return {
        ...row,
        utilization,
        available_credit: availableCredit,
        is_overdue: status.isOverdue,
        days_until_due: status.daysUntilDue,
        urgency: status.urgency,
      };
    });
  },

  /**
   * Get a single statement by ID
   */
  async getById(db: D1Database, statementId: string, userId: string): Promise<StatementWithStatus | null> {
    const result = await db
      .prepare(`
        SELECT
          cs.*,
          fa.user_id,
          cc.credit_limit
        FROM credit_card_statements cs
        INNER JOIN financial_accounts fa ON cs.account_id = fa.id
        INNER JOIN credit_card_configs cc ON cs.account_id = cc.account_id
        WHERE cs.id = ? AND fa.user_id = ?
      `)
      .bind(statementId, userId)
      .first<CreditCardStatementRow & { user_id: string; credit_limit: number }>();

    if (!result) return null;

    const dueDate = new Date(result.due_date);
    const status = getCycleStatus(dueDate, result.payment_status);
    const availableCredit = result.credit_limit - result.closing_balance;
    const utilization = (result.closing_balance / result.credit_limit) * 100;

    return {
      id: result.id,
      account_id: result.account_id,
      cycle_start_date: result.cycle_start_date,
      cycle_end_date: result.cycle_end_date,
      statement_date: result.statement_date,
      due_date: result.due_date,
      opening_balance: result.opening_balance,
      closing_balance: result.closing_balance,
      total_charges: result.total_charges,
      total_payments: result.total_payments,
      total_fees: result.total_fees,
      minimum_payment: result.minimum_payment,
      payment_status: result.payment_status,
      amount_paid: result.amount_paid,
      paid_at: result.paid_at,
      pdf_url: result.pdf_url,
      created_at: result.created_at,
      updated_at: result.updated_at,
      utilization,
      available_credit: availableCredit,
      is_overdue: status.isOverdue,
      days_until_due: status.daysUntilDue,
      urgency: status.urgency,
    };
  },

  /**
   * Generate a new statement for a billing cycle
   */
  async generate(
    db: D1Database,
    cardId: string,
    userId: string,
    cycleStartDate: Date,
    cycleEndDate: Date
  ): Promise<StatementWithStatus | null> {
    const card = await creditCardDb.getById(db, cardId, userId);
    if (!card) return null;

    const statementId = crypto.randomUUID();

    // Calculate billing cycle dates
    const billingCycle = getBillingCycle(cycleEndDate, card.config);
    const statementDate = billingCycle.statementDate;
    const dueDate = billingCycle.dueDate;

    // Calculate minimum payment (typically 2-3% of balance or $25 minimum)
    const minimumPayment = Math.max(25, Math.round(card.current_balance * 0.02));

    await db
      .prepare(`
        INSERT INTO credit_card_statements (
          id, account_id, cycle_start_date, cycle_end_date,
          statement_date, due_date, opening_balance, closing_balance,
          total_charges, total_payments, total_fees, minimum_payment,
          payment_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNPAID')
      `)
      .bind(
        statementId,
        cardId,
        cycleStartDate.toISOString().split("T")[0],
        cycleEndDate.toISOString().split("T")[0],
        statementDate.toISOString().split("T")[0],
        dueDate.toISOString().split("T")[0],
        0, // opening_balance - will be calculated from transactions
        card.current_balance,
        0, // total_charges - will be calculated from transactions
        0, // total_payments - will be calculated from transactions
        0, // total_fees
        minimumPayment
      )
      .run();

    return statementDb.getById(db, statementId, userId);
  },

  /**
   * Update statement payment status
   */
  async updatePayment(
    db: D1Database,
    statementId: string,
    userId: string,
    amount: number
  ): Promise<StatementWithStatus | null> {
    const statement = await statementDb.getById(db, statementId, userId);
    if (!statement) return null;

    const newAmountPaid = statement.amount_paid + amount;
    const isFullyPaid = newAmountPaid >= statement.closing_balance;

    await db
      .prepare(`
        UPDATE credit_card_statements
        SET
          amount_paid = ?,
          payment_status = ?,
          paid_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE paid_at END
        WHERE id = ?
      `)
      .bind(
        newAmountPaid,
        isFullyPaid ? "PAID" : "PARTIAL",
        isFullyPaid ? 1 : 0,
        statementId
      )
      .run();

    return statementDb.getById(db, statementId, userId);
  },

  /**
   * Get current active statement (unpaid) for a card
   */
  async getCurrentStatement(db: D1Database, cardId: string, userId: string): Promise<StatementWithStatus | null> {
    const result = await db
      .prepare(`
        SELECT * FROM credit_card_statements
        WHERE account_id = ?
          AND payment_status IN ('UNPAID', 'PARTIAL')
        ORDER BY statement_date DESC
        LIMIT 1
      `)
      .bind(cardId)
      .first<CreditCardStatementRow>();

    if (!result) return null;

    return statementDb.getById(db, result.id, userId);
  },

  /**
   * Get all unpaid statements across all cards for a user
   */
  async getUnpaidStatements(db: D1Database, userId: string): Promise<StatementWithStatus[]> {
    const result = await db
      .prepare(`
        SELECT cs.*, fa.user_id, cc.credit_limit
        FROM credit_card_statements cs
        INNER JOIN financial_accounts fa ON cs.account_id = fa.id
        INNER JOIN credit_card_configs cc ON cs.account_id = cc.account_id
        WHERE fa.user_id = ?
          AND fa.type = 'CREDIT_CARD'
          AND fa.is_archived = 0
          AND cs.payment_status IN ('UNPAID', 'PARTIAL')
        ORDER BY cs.due_date ASC
      `)
      .bind(userId)
      .all<CreditCardStatementRow & { user_id: string; credit_limit: number }>();

    return result.results.map((row) => {
      const dueDate = new Date(row.due_date);
      const status = getCycleStatus(dueDate, row.payment_status);

      return {
        ...row,
        utilization: (row.closing_balance / row.credit_limit) * 100,
        available_credit: row.credit_limit - row.closing_balance,
        is_overdue: status.isOverdue,
        days_until_due: status.daysUntilDue,
        urgency: status.urgency,
      };
    });
  },

  /**
   * Get statement with transactions for PDF generation
   */
  async getStatementWithTransactions(
    db: D1Database,
    statementId: string,
    userId: string
  ): Promise<{
    card: {
      id: string;
      name: string;
      account_number_last4: string | null;
      currency: string;
    };
    statement: CreditCardStatementRow;
    transactions: CreditCardTransaction[];
  } | null> {
    const statement = await statementDb.getById(db, statementId, userId);
    if (!statement) return null;

    const card = await creditCardDb.getById(db, statement.account_id, userId);
    if (!card) return null;

    // Get transactions for the statement period
    const transactionsResult = await db
      .prepare(`
        SELECT
          t.date,
          t.description,
          t.amount,
          c.name as category_name,
          t.status
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.account_id = ?
          AND t.user_id = ?
          AND t.date >= ?
          AND t.date <= ?
        ORDER BY t.date ASC, t.created_at ASC
      `)
      .bind(
        statement.account_id,
        userId,
        statement.cycle_start_date,
        statement.cycle_end_date
      )
      .all<{
        date: string;
        description: string;
        amount: number;
        category_name: string | null;
        status: string;
      }>();

    const transactions: CreditCardTransaction[] =
      transactionsResult.results?.map((t) => ({
        date: new Date(t.date),
        description: t.description,
        amount: t.amount,
        categoryName: t.category_name || undefined,
        status: t.status,
      })) || [];

    return {
      card: {
        id: card.id,
        name: card.name,
        account_number_last4: card.account_number_last4,
        currency: card.currency,
      },
      statement: {
        id: statement.id,
        account_id: statement.account_id,
        cycle_start_date: statement.cycle_start_date,
        cycle_end_date: statement.cycle_end_date,
        statement_date: statement.statement_date,
        due_date: statement.due_date,
        opening_balance: statement.opening_balance,
        closing_balance: statement.closing_balance,
        total_charges: statement.total_charges,
        total_payments: statement.total_payments,
        total_fees: statement.total_fees,
        minimum_payment: statement.minimum_payment,
        payment_status: statement.payment_status,
        amount_paid: statement.amount_paid,
        paid_at: statement.paid_at,
        pdf_url: statement.pdf_url,
        created_at: statement.created_at,
        updated_at: statement.updated_at,
      },
      transactions,
    };
  },
};

/**
 * Get all unpaid statements for a user across all credit cards
 */
export async function getUnpaidStatements(
  request: Request,
  userId: string
): Promise<Array<StatementWithStatus & { card_name: string; card_id: string }>> {
  const db = getDb(request);
  const statements = await statementDb.getUnpaidStatements(db, userId);

  // Fetch card names for each statement
  const result = await Promise.all(
    statements.map(async (statement) => {
      const card = await creditCardDb.getById(db, statement.account_id, userId);
      return {
        ...statement,
        card_name: card?.name || "Unknown Card",
        card_id: statement.account_id,
      };
    })
  );

  return result;
}

// ============================================================================
// Current Cycle Information
// ============================================================================

/**
 * Get current billing cycle information for a credit card
 */
export async function getCurrentCycleInfo(
  db: D1Database,
  cardId: string,
  userId: string
): Promise<CurrentCycleInfo | null> {
  const card = await creditCardDb.getById(db, cardId, userId);
  if (!card) return null;

  const billingCycle = getBillingCycle(new Date(), card.config);
  const currentStatement = await statementDb.getCurrentStatement(db, cardId, userId);
  const status = getCycleStatus(billingCycle.dueDate, currentStatement?.payment_status || "UNPAID");

  const utilizationPercent = (card.current_balance / card.config.credit_limit) * 100;
  const minimumPayment = currentStatement?.minimum_payment || Math.max(25, Math.round(card.current_balance * 0.02));

  return {
    card_id: card.id,
    cycle_start_date: billingCycle.cycleStartDate,
    cycle_end_date: billingCycle.cycleEndDate,
    statement_date: billingCycle.statementDate,
    due_date: billingCycle.dueDate,
    days_until_due: billingCycle.daysUntilDue,
    days_until_statement: billingCycle.daysUntilStatement,
    cycle_progress: billingCycle.cycleProgress,
    current_balance: card.current_balance,
    available_credit: card.config.credit_limit - card.current_balance,
    credit_limit: card.config.credit_limit,
    utilization_percent: utilizationPercent,
    minimum_payment: minimumPayment,
    payment_status: currentStatement?.payment_status || "UNPAID",
    is_overdue: status.isOverdue,
    urgency: status.urgency,
  };
}

/**
 * Get all credit cards with current cycle info for dashboard
 */
export async function getCardsWithCycleInfo(
  request: Request,
  userId: string
): Promise<Array<CreditCardWithConfig & { currentCycle: CurrentCycleInfo }>> {
  const db = getDb(request);
  const cards = await creditCardDb.getAll(db, userId);

  const result = await Promise.all(
    cards.map(async (card) => {
      const cycleInfo = await getCurrentCycleInfo(db, card.id, userId);
      return {
        ...card,
        currentCycle: cycleInfo!,
      };
    })
  );

  return result;
}
