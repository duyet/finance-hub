/**
 * Action route for creating transaction from receipt data
 * POST /action/create-transaction-from-receipt
 */

import type { ActionFunctionArgs } from "react-router";
import { getUserFromSession } from "../lib/auth/session.server";
import { getDb } from "../lib/auth/db.server";
import { transactionsCrud } from "../lib/db/transactions.server";
import { receiptsCrud } from "../lib/db/receipts.server";
import { receiptFormSchema } from "../lib/validations/receipt";

export async function action({ request }: ActionFunctionArgs) {
  const user = await getUserFromSession(request);

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const rawData = {
      accountId: formData.get("accountId"),
      categoryId: formData.get("categoryId") || null,
      date: formData.get("date"),
      amount: parseFloat(formData.get("amount") as string),
      description: formData.get("description"),
      merchantName: formData.get("merchantName") || null,
      notes: formData.get("notes") || null,
      receiptId: formData.get("receiptId"),
      createTransaction: formData.get("createTransaction") === "true",
    };

    // Validate input
    const validatedData = receiptFormSchema.parse(rawData);
    const db = getDb(request);

    // Get receipt data
    const receipt = await receiptsCrud.getReceiptById(
      db,
      validatedData.receiptId,
      user.id
    );

    if (!receipt) {
      return Response.json({ error: "Receipt not found" }, { status: 404 });
    }

    if (validatedData.createTransaction) {
      // Create transaction
      const transaction = await transactionsCrud.createTransaction(db, user.id, {
        accountId: validatedData.accountId,
        categoryId: validatedData.categoryId,
        date: validatedData.date,
        amount: validatedData.amount,
        description: validatedData.description,
        merchantName: validatedData.merchantName,
        receiptUrl: receipt.imageUrl,
        notes: validatedData.notes,
      });

      // Link receipt to transaction
      await receiptsCrud.linkToTransaction(
        db,
        validatedData.receiptId,
        user.id,
        transaction.id
      );

      return Response.json({
        success: true,
        transactionId: transaction.id,
        receiptId: validatedData.receiptId,
      });
    } else {
      // Just update receipt with form data
      await receiptsCrud.updateReceipt(db, validatedData.receiptId, user.id, {
        extractedData: {
          ...receipt.extractedData,
          merchantName: validatedData.merchantName,
          date: validatedData.date,
          totalAmount: validatedData.amount,
        },
      });
    }

    return Response.json({
      success: true,
      receiptId: validatedData.receiptId,
    });
  } catch (error) {
    console.error("Create transaction from receipt error:", error);

    if (error instanceof Error && error.name === "ZodError") {
      const zodError = error as any;
      return Response.json(
        { error: "Validation error", details: zodError.errors },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error: "Failed to create transaction",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
