/**
 * AI Insights API Route
 *
 * API endpoint for AI-powered financial insights.
 * Handles questions and generates responses using Cloudflare Workers AI.
 */

import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { answerFinancialQuestion } from "~/lib/services/ai-insights.server";
import { getDb } from "~/lib/auth/db.server";

/**
 * Database row types for AI context queries
 */
interface CategoryRow {
  id: string;
  name: string;
}

interface TransactionRow {
  date: string;
  amount: number;
  description: string;
  category_id: string | null;
}

interface AccountRow {
  name: string;
  type: string;
  balance: number;
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Only accept POST requests
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json() as { question?: string; context?: Record<string, unknown> };
    const { question, context } = body;

    if (!question || typeof question !== "string") {
      return new Response(JSON.stringify({ error: "Question is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch user's recent transactions and accounts for context
    const recentTransactionsResult = await db
      .prepare(
        `SELECT date, amount, description, category_id
         FROM transactions
         WHERE user_id = ? AND status = 'POSTED'
         ORDER BY date DESC
         LIMIT 10`
      )
      .bind(user.id)
      .all();

    const accountsResult = await db
      .prepare(
        `SELECT name, type, balance
         FROM financial_accounts
         WHERE user_id = ? AND is_archived = 0
         ORDER BY name`
      )
      .bind(user.id)
      .all();

    // Get category names for transactions
    const categoriesResult = await db
      .prepare(`SELECT id, name FROM categories WHERE user_id = ?`)
      .bind(user.id)
      .all();

    const categories = (categoriesResult.results || []) as unknown as CategoryRow[];
    const categoryMap = new Map(categories.map((c: CategoryRow) => [c.id, c.name]));

    // Enrich transaction data with category names
    const recentTransactions = recentTransactionsResult.results || [];
    const enrichedTransactions = recentTransactions.map((t: unknown) => {
      const tt = t as TransactionRow;
      return {
        date: tt.date,
        amount: tt.amount,
        description: tt.description,
        category: categoryMap.get(tt.category_id ?? "") || "Uncategorized",
      };
    });

    // Get AI answer
    const answer = await answerFinancialQuestion(
      request,
      { question, context },
      {
        recentTransactions: enrichedTransactions,
        accounts: (accountsResult.results || []).map((a: unknown) => {
          const aa = a as AccountRow;
          return {
            name: aa.name,
            type: aa.type,
            balance: aa.balance,
          };
        }),
      }
    );

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI insights error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate insights" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
