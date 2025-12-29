/**
 * API Route: Recurring Transactions
 *
 * CRUD endpoints for managing recurring transaction templates.
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { json } from "~/lib/api/utils";
import { requireUserId } from "~/lib/auth/auth.server";
import {
  createRecurringTransaction,
  getRecurringTransaction,
  getRecurringTransactions,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  getUpcomingRecurringTransactions,
  processDueRecurringTransactions,
  type CreateRecurringTransactionInput,
  type RecurringTransaction,
} from "~/lib/services/recurring-transactions.server";
import type { Env } from "~/lib/auth/db.server";

/**
 * GET /api/recurring-transactions
 * List all recurring transactions for the current user
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const userId = await requireUserId({ request, context });
  const env = context.env as Env;
  const db = env.DB;

  const url = new URL(request.url);
  const upcoming = url.searchParams.get("upcoming") === "true";

  if (upcoming) {
    const daysAhead = parseInt(url.searchParams.get("days") || "30", 10);
    const transactions = await getUpcomingRecurringTransactions(db, userId, daysAhead);
    return json({ transactions });
  }

  const transactions = await getRecurringTransactions(db, userId);
  return json({ transactions });
}

/**
 * POST /api/recurring-transactions
 * Create a new recurring transaction template
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const userId = await requireUserId({ request, context });
  const env = context.env as Env;
  const db = env.DB;

  if (request.method === "POST") {
    const input = await request.json<CreateRecurringTransactionInput>();

    // Validate input
    if (!input.name || !input.description || !input.amount) {
      return json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!input.startDate || !input.frequency) {
      return json({ error: "Start date and frequency are required" }, { status: 400 });
    }

    try {
      const recurring = await createRecurringTransaction(db, {
        ...input,
        userId,
      });
      return json({ recurring }, { status: 201 });
    } catch (error) {
      console.error("Failed to create recurring transaction:", error);
      return json({ error: "Failed to create recurring transaction" }, { status: 500 });
    }
  }

  if (request.method === "PUT") {
    const input = await request.json<{
      id: string;
      updates: Partial<Omit<RecurringTransaction, "id" | "userId" | "createdAt">>;
    }>();

    if (!input.id) {
      return json({ error: "Recurring transaction ID is required" }, { status: 400 });
    }

    try {
      const success = await updateRecurringTransaction(db, input.id, input.updates);
      if (!success) {
        return json({ error: "Recurring transaction not found" }, { status: 404 });
      }

      const recurring = await getRecurringTransaction(db, input.id);
      return json({ recurring });
    } catch (error) {
      console.error("Failed to update recurring transaction:", error);
      return json({ error: "Failed to update recurring transaction" }, { status: 500 });
    }
  }

  if (request.method === "DELETE") {
    const input = await request.json<{ id: string }>();

    if (!input.id) {
      return json({ error: "Recurring transaction ID is required" }, { status: 400 });
    }

    try {
      const success = await deleteRecurringTransaction(db, input.id);
      if (!success) {
        return json({ error: "Recurring transaction not found" }, { status: 404 });
      }

      return json({ success: true });
    } catch (error) {
      console.error("Failed to delete recurring transaction:", error);
      return json({ error: "Failed to delete recurring transaction" }, { status: 500 });
    }
  }

  if (request.method === "PATCH") {
    // Process due recurring transactions (for cron job/worker)
    try {
      const result = await processDueRecurringTransactions(db);
      return json({ result });
    } catch (error) {
      console.error("Failed to process recurring transactions:", error);
      return json({ error: "Failed to process recurring transactions" }, { status: 500 });
    }
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}
