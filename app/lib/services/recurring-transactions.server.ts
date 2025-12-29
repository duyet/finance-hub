/**
 * Recurring Transactions Service
 *
 * Manages recurring transaction templates and automatic transaction generation.
 *
 * Features:
 * - CRUD operations for recurring transaction templates
 * - Next generation date calculation based on frequency
 * - Automatic transaction generation from templates
 * - Upcoming recurring transactions query
 */

import type { D1Database } from "@cloudflare/workers-types";
import type { Env } from "../auth/db.server";

/**
 * Recurring transaction frequency types
 */
export type RecurringFrequency =
  | "DAILY"
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "YEARLY";

/**
 * Recurring transaction data
 */
export interface RecurringTransaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId: string | null;
  name: string;
  description: string;
  amount: number;
  frequency: RecurringFrequency;
  intervalValue: number;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD or null for indefinite
  dayOfMonth: number | null; // 1-31 or -1 for last day
  dayOfWeek: number | null; // 0-6 (Sunday-Saturday)
  isActive: boolean;
  autoGenerate: boolean;
  lastGeneratedDate: string | null; // YYYY-MM-DD
  nextGenerationDate: string | null; // YYYY-MM-DD
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a recurring transaction
 */
export interface CreateRecurringTransactionInput {
  userId: string;
  accountId: string;
  categoryId?: string | null;
  name: string;
  description: string;
  amount: number;
  frequency: RecurringFrequency;
  intervalValue?: number;
  startDate: string; // YYYY-MM-DD
  endDate?: string | null;
  dayOfMonth?: number | null;
  dayOfWeek?: number | null;
  isActive?: boolean;
  autoGenerate?: boolean;
  notes?: string | null;
}

/**
 * Calculate next generation date based on frequency
 */
export function calculateNextGenerationDate(
  baseDate: string,
  frequency: RecurringFrequency,
  intervalValue: number = 1,
  dayOfMonth?: number | null,
  dayOfWeek?: number | null
): string {
  const date = new Date(baseDate);
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  switch (frequency) {
    case "DAILY":
      date.setDate(day + intervalValue);
      break;

    case "WEEKLY":
      date.setDate(day + (7 * intervalValue));
      break;

    case "BIWEEKLY":
      date.setDate(day + (14 * intervalValue));
      break;

    case "MONTHLY":
      if (dayOfMonth !== null && dayOfMonth !== undefined) {
        // Specific day of month
        const nextMonth = new Date(year, month + intervalValue, 1);
        const lastDayOfNextMonth = new Date(year, month + intervalValue + 1, 0).getDate();
        const targetDay = dayOfMonth === -1
          ? lastDayOfNextMonth
          : Math.min(dayOfMonth, lastDayOfNextMonth);
        date.setFullYear(year);
        date.setMonth(month + intervalValue);
        date.setDate(targetDay);
      } else {
        // Same day next month
        date.setMonth(month + intervalValue);
      }
      break;

    case "QUARTERLY":
      date.setMonth(month + (3 * intervalValue));
      break;

    case "YEARLY":
      date.setFullYear(year + intervalValue);
      break;
  }

  return date.toISOString().split("T")[0]; // Return YYYY-MM-DD
}

/**
 * Create a new recurring transaction template
 */
export async function createRecurringTransaction(
  db: D1Database,
  input: CreateRecurringTransactionInput
): Promise<RecurringTransaction> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Calculate first generation date
  const nextGenerationDate = calculateNextGenerationDate(
    input.startDate,
    input.frequency,
    input.intervalValue,
    input.dayOfMonth,
    input.dayOfWeek
  );

  await db
    .prepare(
      `INSERT INTO recurring_transactions (
        id, user_id, account_id, category_id, name, description, amount,
        frequency, interval_value, start_date, end_date, day_of_month, day_of_week,
        is_active, auto_generate, next_generation_date, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.userId,
      input.accountId,
      input.categoryId || null,
      input.name,
      input.description,
      input.amount,
      input.frequency,
      input.intervalValue || 1,
      input.startDate,
      input.endDate || null,
      input.dayOfMonth || null,
      input.dayOfWeek || null,
      input.isActive !== undefined ? (input.isActive ? 1 : 0) : 1,
      input.autoGenerate !== undefined ? (input.autoGenerate ? 1 : 0) : 1,
      nextGenerationDate,
      input.notes || null,
      now,
      now
    )
    .run();

  return getRecurringTransaction(db, id) as Promise<RecurringTransaction>;
}

/**
 * Get a recurring transaction by ID
 */
export async function getRecurringTransaction(
  db: D1Database,
  id: string
): Promise<RecurringTransaction | null> {
  const result = await db
    .prepare(
      `SELECT
        id as id,
        user_id as userId,
        account_id as accountId,
        category_id as categoryId,
        name,
        description,
        amount,
        frequency as frequency,
        interval_value as intervalValue,
        start_date as startDate,
        end_date as endDate,
        day_of_month as dayOfMonth,
        day_of_week as dayOfWeek,
        is_active as isActive,
        auto_generate as autoGenerate,
        last_generated_date as lastGeneratedDate,
        next_generation_date as nextGenerationDate,
        notes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM recurring_transactions
      WHERE id = ?`
    )
    .bind(id)
    .first<RecurringTransaction>();

  return result || null;
}

/**
 * Get all recurring transactions for a user
 */
export async function getRecurringTransactions(
  db: D1Database,
  userId: string,
  options?: { active?: boolean }
): Promise<RecurringTransaction[]> {
  let query = `
    SELECT
      id as id,
      user_id as userId,
      account_id as accountId,
      category_id as categoryId,
      name,
      description,
      amount,
      frequency as frequency,
      interval_value as intervalValue,
      start_date as startDate,
      end_date as endDate,
      day_of_month as dayOfMonth,
      day_of_week as dayOfWeek,
      is_active as isActive,
      auto_generate as autoGenerate,
      last_generated_date as lastGeneratedDate,
      next_generation_date as nextGenerationDate,
      notes,
      created_at as createdAt,
      updated_at as updatedAt
    FROM recurring_transactions
    WHERE user_id = ?
  `;

  const params: [string] = [userId];

  if (options?.active !== undefined) {
    query += ` AND is_active = ?`;
    params.push(options.active ? 1 : 0);
  }

  query += ` ORDER BY next_generation_date ASC`;

  const result = await db.prepare(query).bind(...params).all<RecurringTransaction>();
  return result.results || [];
}

/**
 * Update a recurring transaction
 */
export async function updateRecurringTransaction(
  db: D1Database,
  id: string,
  updates: Partial<Omit<RecurringTransaction, "id" | "userId" | "createdAt">>
): Promise<boolean> {
  const fields: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.amount !== undefined) {
    fields.push("amount = ?");
    values.push(updates.amount);
  }
  if (updates.frequency !== undefined) {
    fields.push("frequency = ?");
    values.push(updates.frequency);
  }
  if (updates.intervalValue !== undefined) {
    fields.push("interval_value = ?");
    values.push(updates.intervalValue);
  }
  if (updates.startDate !== undefined) {
    fields.push("start_date = ?");
    values.push(updates.startDate);
  }
  if (updates.endDate !== undefined) {
    fields.push("end_date = ?");
    values.push(updates.endDate);
  }
  if (updates.dayOfMonth !== undefined) {
    fields.push("day_of_month = ?");
    values.push(updates.dayOfMonth);
  }
  if (updates.dayOfWeek !== undefined) {
    fields.push("day_of_week = ?");
    values.push(updates.dayOfWeek);
  }
  if (updates.isActive !== undefined) {
    fields.push("is_active = ?");
    values.push(updates.isActive ? 1 : 0);
  }
  if (updates.autoGenerate !== undefined) {
    fields.push("auto_generate = ?");
    values.push(updates.autoGenerate ? 1 : 0);
  }
  if (updates.notes !== undefined) {
    fields.push("notes = ?");
    values.push(updates.notes);
  }

  if (fields.length === 0) {
    return false;
  }

  values.push(id);

  await db
    .prepare(`UPDATE recurring_transactions SET ${fields.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

  return true;
}

/**
 * Delete a recurring transaction
 */
export async function deleteRecurringTransaction(
  db: D1Database,
  id: string
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM recurring_transactions WHERE id = ?`)
    .bind(id)
    .run();

  return (result.meta.changes || 0) > 0;
}

/**
 * Get upcoming recurring transactions (due within next 30 days)
 */
export async function getUpcomingRecurringTransactions(
  db: D1Database,
  userId: string,
  daysAhead: number = 30
): Promise<RecurringTransaction[]> {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const futureDateStr = futureDate.toISOString().split("T")[0];

  const result = await db
    .prepare(
      `SELECT
        id as id,
        user_id as userId,
        account_id as accountId,
        category_id as categoryId,
        name,
        description,
        amount,
        frequency as frequency,
        interval_value as intervalValue,
        start_date as startDate,
        end_date as endDate,
        day_of_month as dayOfMonth,
        day_of_week as dayOfWeek,
        is_active as isActive,
        auto_generate as autoGenerate,
        last_generated_date as lastGeneratedDate,
        next_generation_date as nextGenerationDate,
        notes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM recurring_transactions
      WHERE user_id = ?
        AND is_active = 1
        AND next_generation_date <= ?
      ORDER BY next_generation_date ASC
      LIMIT 10`
    )
    .bind(userId, futureDateStr)
    .all<RecurringTransaction>();

  return result.results || [];
}

/**
 * Generate actual transaction from recurring template
 */
export async function generateTransactionFromRecurring(
  db: D1Database,
  recurringId: string
): Promise<string | null> {
  const recurring = await getRecurringTransaction(db, recurringId);

  if (!recurring) {
    return null;
  }

  // Check if end date reached
  if (recurring.endDate && recurring.nextGenerationDate > recurring.endDate) {
    // Deactivate the recurring transaction
    await updateRecurringTransaction(db, recurringId, { isActive: false });
    return null;
  }

  // Create the actual transaction
  const transactionId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO transactions (
        id, user_id, account_id, category_id, date, amount, description,
        merchant_name, status, is_recurring, recurring_transaction_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      transactionId,
      recurring.userId,
      recurring.accountId,
      recurring.categoryId,
      recurring.nextGenerationDate,
      recurring.amount,
      recurring.description,
      recurring.name,
      "POSTED",
      1,
      recurring.id,
      now,
      now
    )
    .run();

  // Update recurring transaction with new next generation date
  const newNextDate = calculateNextGenerationDate(
    recurring.nextGenerationDate,
    recurring.frequency,
    recurring.intervalValue,
    recurring.dayOfMonth,
    recurring.dayOfWeek
  );

  await updateRecurringTransaction(db, recurringId, {
    lastGeneratedDate: recurring.nextGenerationDate,
    nextGenerationDate: newNextDate,
  });

  return transactionId;
}

/**
 * Process all recurring transactions due for generation
 *
 * This function should be called by a scheduled worker/cron job
 */
export async function processDueRecurringTransactions(
  db: D1Database
): Promise<{ generated: number; skipped: number }> {
  const today = new Date().toISOString().split("T")[0];

  // Get all recurring transactions that are due
  const result = await db
    .prepare(
      `SELECT id FROM recurring_transactions
      WHERE is_active = 1
        AND auto_generate = 1
        AND next_generation_date <= ?`
    )
    .bind(today)
    .all<{ id: string }>();

  const recurringIds = result.results?.map((r) => r.id) || [];

  let generated = 0;
  let skipped = 0;

  for (const id of recurringIds) {
    try {
      const transactionId = await generateTransactionFromRecurring(db, id);
      if (transactionId) {
        generated++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(`Failed to generate transaction from recurring template ${id}:`, error);
      skipped++;
    }
  }

  return { generated, skipped };
}
