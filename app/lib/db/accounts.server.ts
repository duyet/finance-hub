/**
 * Financial Accounts Database Operations
 *
 * Handles all financial account CRUD operations for general account types
 * (CHECKING, SAVINGS, WALLET, INVESTMENT).
 * Credit cards and loans have their own specialized handlers.
 */

import type { D1Database } from "@cloudflare/workers-types";
import type {
  FinancialAccount,
  AccountType,
  CreateAccountData,
  UpdateAccountData,
  AccountWithTransactions,
} from "./accounts.types";

// Re-export types for convenience
export type {
  FinancialAccount,
  AccountType,
  CreateAccountData,
  UpdateAccountData,
  AccountWithTransactions,
};

interface FinancialAccountRow {
  id: string;
  user_id: string;
  name: string;
  type: AccountType;
  currency: string;
  current_balance: number;
  institution_name: string | null;
  account_number_last4: string | null;
  color_theme: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Account CRUD Operations
// ============================================================================

export const accountDb = {
  /**
   * Get all financial accounts for a user
   */
  async getAll(db: D1Database, userId: string): Promise<FinancialAccount[]> {
    const result = await db
      .prepare(`
        SELECT *
        FROM financial_accounts
        WHERE user_id = ?
          AND is_archived = 0
        ORDER BY type ASC, name ASC
      `)
      .bind(userId)
      .all<FinancialAccountRow>();

    return result.results;
  },

  /**
   * Get a single account by ID
   */
  async getById(
    db: D1Database,
    accountId: string,
    userId: string
  ): Promise<FinancialAccount | null> {
    const result = await db
      .prepare(`
        SELECT *
        FROM financial_accounts
        WHERE id = ?
          AND user_id = ?
      `)
      .bind(accountId, userId)
      .first<FinancialAccountRow>();

    return result || null;
  },

  /**
   * Get account with recent transactions
   */
  async getByIdWithTransactions(
    db: D1Database,
    accountId: string,
    userId: string,
    transactionLimit: number = 10
  ): Promise<AccountWithTransactions | null> {
    const account = await accountDb.getById(db, accountId, userId);
    if (!account) return null;

    const transactions = await db
      .prepare(`
        SELECT
          id,
          date,
          description,
          amount,
          category_name
        FROM transactions
        WHERE account_id = ?
          AND user_id = ?
        ORDER BY date DESC
        LIMIT ?
      `)
      .bind(accountId, userId, transactionLimit)
      .all<{
        id: string;
        date: string;
        description: string;
        amount: number;
        category_name: string | null;
      }>();

    return {
      ...account,
      recentTransactions: transactions.results.map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: t.category_name,
      })),
    };
  },

  /**
   * Create a new financial account
   */
  async create(
    db: D1Database,
    userId: string,
    data: CreateAccountData
  ): Promise<FinancialAccount> {
    const accountId = crypto.randomUUID();

    await db
      .prepare(`
        INSERT INTO financial_accounts (
          id,
          user_id,
          name,
          type,
          currency,
          institution_name,
          account_number_last4,
          color_theme,
          current_balance,
          is_archived
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
      `)
      .bind(
        accountId,
        userId,
        data.name,
        data.type,
        data.currency || "VND",
        data.institution_name || null,
        data.account_number_last4 || null,
        data.color_theme || null
      )
      .run();

    const account = await accountDb.getById(db, accountId, userId);
    if (!account) {
      throw new Error("Failed to create account");
    }

    return account;
  },

  /**
   * Update a financial account
   */
  async update(
    db: D1Database,
    accountId: string,
    userId: string,
    data: UpdateAccountData
  ): Promise<FinancialAccount | null> {
    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.currency !== undefined) {
      updates.push("currency = ?");
      values.push(data.currency);
    }
    if (data.institution_name !== undefined) {
      updates.push("institution_name = ?");
      values.push(data.institution_name);
    }
    if (data.account_number_last4 !== undefined) {
      updates.push("account_number_last4 = ?");
      values.push(data.account_number_last4);
    }
    if (data.color_theme !== undefined) {
      updates.push("color_theme = ?");
      values.push(data.color_theme);
    }
    if (data.current_balance !== undefined) {
      updates.push("current_balance = ?");
      values.push(data.current_balance);
    }

    if (updates.length > 0) {
      updates.push("updated_at = CURRENT_TIMESTAMP");
      values.push(accountId, userId);

      await db
        .prepare(`
          UPDATE financial_accounts
          SET ${updates.join(", ")}
          WHERE id = ? AND user_id = ?
        `)
        .bind(...values)
        .run();
    }

    return accountDb.getById(db, accountId, userId);
  },

  /**
   * Archive (soft delete) a financial account
   */
  async archive(
    db: D1Database,
    accountId: string,
    userId: string
  ): Promise<boolean> {
    const result = await db
      .prepare(`
        UPDATE financial_accounts
        SET is_archived = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?
      `)
      .bind(accountId, userId)
      .run();

    return result.meta.changes > 0;
  },

  /**
   * Get account balance summary
   */
  async getBalanceSummary(
    db: D1Database,
    userId: string
  ): Promise<
    Array<{
      type: AccountType;
      total_balance: number;
      account_count: number;
    }>
  > {
    const result = await db
      .prepare(`
        SELECT
          type,
          SUM(current_balance) as total_balance,
          COUNT(*) as account_count
        FROM financial_accounts
        WHERE user_id = ?
          AND is_archived = 0
        GROUP BY type
        ORDER BY type ASC
      `)
      .bind(userId)
      .all<{
        type: AccountType;
    total_balance: number;
    account_count: number;
  }>();

    return result.results;
  },

  /**
   * Get total net worth across all accounts
   */
  async getNetWorth(db: D1Database, userId: string): Promise<number> {
    const result = await db
      .prepare(`
        SELECT
          SUM(
            CASE
              WHEN type IN ('CHECKING', 'SAVINGS', 'WALLET', 'INVESTMENT')
                THEN current_balance
              WHEN type = 'CREDIT_CARD'
                THEN -current_balance
              WHEN type = 'LOAN'
                THEN -current_balance
              ELSE 0
            END
          ) as net_worth
        FROM financial_accounts
        WHERE user_id = ?
          AND is_archived = 0
      `)
      .bind(userId)
      .first<{ net_worth: number }>();

    return result?.net_worth || 0;
  },
};
