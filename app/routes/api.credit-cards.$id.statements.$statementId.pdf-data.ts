/**
 * API Route: Credit Card Statement PDF Data
 * Returns statement data with transactions for PDF generation
 */

import type { LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import { statementDb } from "~/lib/db/credit-cards.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const cardId = params.id;
  const statementId = params.statementId;

  if (!cardId || !statementId) {
    throw new Response("Card ID and Statement ID are required", { status: 400 });
  }

  // Fetch statement with transactions
  const statementData = await statementDb.getStatementWithTransactions(
    db,
    statementId,
    user.id
  );

  if (!statementData) {
    throw new Response("Statement not found", { status: 404 });
  }

  // Verify the statement belongs to the specified card
  if (statementData.card.id !== cardId) {
    throw new Response("Statement does not belong to this card", { status: 403 });
  }

  // Transform data for PDF component
  const pdfData = {
    card: {
      id: statementData.card.id,
      name: statementData.card.name,
      account_number_last4: statementData.card.account_number_last4 || undefined,
      currency: statementData.card.currency,
    },
    statement: {
      cycle_start_date: new Date(statementData.statement.cycle_start_date),
      cycle_end_date: new Date(statementData.statement.cycle_end_date),
      statement_date: new Date(statementData.statement.statement_date),
      due_date: new Date(statementData.statement.due_date),
      opening_balance: statementData.statement.opening_balance,
      closing_balance: statementData.statement.closing_balance,
      total_charges: statementData.statement.total_charges,
      total_payments: statementData.statement.total_payments,
      total_fees: statementData.statement.total_fees,
      minimum_payment: statementData.statement.minimum_payment,
      payment_status: statementData.statement.payment_status,
      amount_paid: statementData.statement.amount_paid,
    },
    transactions: statementData.transactions.map((t) => ({
      date: t.date,
      description: t.description,
      amount: t.amount,
      categoryName: t.categoryName,
      status: t.status,
    })),
  };

  return Response.json(pdfData);
}
