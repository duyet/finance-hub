/**
 * CSV Import Action/Loader
 *
 * Handles CSV file import with user-defined column mapping
 * - Parses CSV files and extracts headers/preview
 * - Imports transactions based on user's column mapping
 * - Supports dry-run mode for validation
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb, type CloudflareRequest } from "~/lib/auth/db.server";
import { accountDb } from "~/lib/db/accounts.server";
import { categoriesCrud } from "~/lib/db/categories.server";
import { transactionsCrud } from "~/lib/db/transactions.server";
import type { CreateTransactionInput } from "~/lib/db/transactions.types";
import { AIService } from "~/lib/services/ai.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  const [accounts, categories] = await Promise.all([
    accountDb.getAll(db, user.id),
    categoriesCrud.getCategories(db, user.id, {}),
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    accounts,
    categories,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "parse") {
    const file = formData.get("file") as File;
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    try {
      // Parse CSV client-side
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const headers = lines[0]?.split(",").map((h) => h.trim().replace(/^"|"$/g, "")) || [];
      const previewRows = lines.slice(1, 11).map((line) => {
        // Simple CSV parsing (handles quoted values)
        const values: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || "";
        });
        return row;
      });

      return Response.json({
        headers,
        previewRows,
      });
    } catch (error) {
      console.error("CSV parse error:", error);
      return Response.json(
        { error: "Failed to parse CSV file. Please check the format." },
        { status: 400 }
      );
    }
  }

  if (intent === "map-columns") {
    const headersJson = formData.get("headers") as string;
    const headers = JSON.parse(headersJson) as string[];

    // Try AI-powered column mapping first
    const cfRequest = request as CloudflareRequest;
    const ai = cfRequest.context?.cloudflare?.env?.AI;

    if (ai) {
      try {
        const aiService = new AIService(ai);
        const aiMapping = await aiService.mapColumns(headers);

        // Convert AI mapping format to our format
        const mapping: Record<string, string> = {};
        if (aiMapping.date) mapping[aiMapping.date] = "date";
        if (aiMapping.amount) mapping[aiMapping.amount] = "amount";
        if (aiMapping.description) mapping[aiMapping.description] = "description";
        if (aiMapping.merchant) mapping[aiMapping.merchant] = "merchantName";
        if (aiMapping.category) mapping[aiMapping.category] = "category";
        if (aiMapping.account) mapping[aiMapping.account] = "account";

        if (Object.keys(mapping).length > 0) {
          return Response.json({ mapping, source: "ai" });
        }
      } catch (error) {
        console.warn("AI column mapping failed, falling back to heuristics:", error);
      }
    }

    // Fallback: Basic heuristic mapping for common column names
    const mapping: Record<string, string> = {};

    for (const header of headers) {
      const lower = header.toLowerCase();
      if (lower.includes("date") || lower.includes("tanggal") || lower.includes("ngày")) {
        mapping[header] = "date";
      } else if (lower.includes("amount") || lower.includes("value") || lower.includes("số tiền")) {
        mapping[header] = "amount";
      } else if (lower.includes("desc") || lower.includes("memo") || lower.includes("mô tả")) {
        mapping[header] = "description";
      } else if (lower.includes("merchant") || lower.includes("payee") || lower.includes("store")) {
        mapping[header] = "merchantName";
      }
    }

    return Response.json({ mapping, source: "heuristic" });
  }

  if (intent === "import") {
    const db = getDb(request);
    const rowsJson = formData.get("rows") as string;
    const mappingJson = formData.get("mapping") as string;
    const optionsJson = formData.get("options") as string;

    if (!rowsJson || !mappingJson || !optionsJson) {
      return Response.json({ error: "Missing required parameters" }, { status: 400 });
    }

    try {
      const rows = JSON.parse(rowsJson) as Array<Record<string, string>>;
      const mapping = JSON.parse(mappingJson) as Record<string, string>;
      const options = JSON.parse(optionsJson) as {
        targetAccountId?: string;
        defaultCategoryId?: string;
        dryRun?: boolean;
      };

      // Validate required mappings
      const reverseMapping = Object.fromEntries(
        Object.entries(mapping).filter(([_, v]) => v) as [string, string][]
      );
      const requiredFields = ["date", "amount", "description"];
      const missingFields = requiredFields.filter((f) => !reverseMapping[f]);

      if (missingFields.length > 0) {
        return Response.json({
          error: `Missing required field mappings: ${missingFields.join(", ")}`,
        }, { status: 400 });
      }

      if (options.dryRun) {
        // Dry run - just validate and return count
        return Response.json({
          imported: rows.length,
          dryRun: true,
          message: `Would import ${rows.length} transactions`,
        });
      }

      // Actual import
      if (!options.targetAccountId) {
        return Response.json({ error: "Target account is required" }, { status: 400 });
      }

      let imported = 0;
      const errors: string[] = [];

      for (const row of rows) {
        try {
          // Parse amount (handle various formats)
          let amountStr = row[reverseMapping.amount] || "0";
          amountStr = amountStr.replace(/[$,\s]/g, "");

          // Handle negative amounts in parentheses
          if (amountStr.startsWith("(") && amountStr.endsWith(")")) {
            amountStr = "-" + amountStr.slice(1, -1);
          }

          const amount = parseFloat(amountStr);
          if (isNaN(amount)) {
            errors.push(`Invalid amount for row: ${row[reverseMapping.description] || "unknown"}`);
            continue;
          }

          // Parse date (handle various formats)
          const dateStr = row[reverseMapping.date];
          let parsedDate = new Date(dateStr);
          if (isNaN(parsedDate.getTime())) {
            // Try DD/MM/YYYY or MM/DD/YYYY format
            const parts = dateStr.split("/");
            if (parts.length === 3) {
              const [a, b, c] = parts;
              // Assume MM/DD/YYYY for US-style dates
              parsedDate = new Date(`${b}/${a}/${c}`);
            }
          }

          if (isNaN(parsedDate.getTime())) {
            errors.push(`Invalid date for row: ${row[reverseMapping.description] || "unknown"}`);
            continue;
          }

          const transactionData: CreateTransactionInput = {
            accountId: options.targetAccountId,
            categoryId: options.defaultCategoryId || null,
            date: parsedDate.toISOString().split("T")[0],
            amount,
            description: row[reverseMapping.description] || "",
            merchantName: reverseMapping.merchantName ? row[reverseMapping.merchantName] : null,
            status: "POSTED",
          };

          await transactionsCrud.createTransaction(db, user.id, transactionData);
          imported++;
        } catch (error) {
          console.error("Error importing row:", error);
          errors.push(`Failed to import row: ${row[reverseMapping.description] || "unknown"}`);
        }
      }

      return Response.json({
        imported,
        errors: errors.length > 0 ? errors : undefined,
        message: `Successfully imported ${imported} transaction${imported !== 1 ? "s" : ""}`,
      });
    } catch (error) {
      console.error("Import error:", error);
      return Response.json(
        { error: "Failed to import transactions. Please check your data format." },
        { status: 500 }
      );
    }
  }

  return Response.json({ error: "Invalid intent" }, { status: 400 });
}
