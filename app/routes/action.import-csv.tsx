/**
 * CSV Import Action Handler
 * Server-side action for processing CSV imports
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { getDb } from "../lib/auth/db.server";
import { requireUserId } from "../lib/auth/auth.server";
import { CsvImportService } from "../lib/services/csv-import.server";
import type { ColumnMapping, ImportOptions } from "../lib/types/csv-import";

/**
 * Loader: Get user's accounts and categories for import options
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);
  const db = getDb(request);

  // Get user's accounts
  const accounts = await db
    .prepare(
      `SELECT id, name FROM financial_accounts
       WHERE user_id = ? AND is_archived = 0
       ORDER BY name`
    )
    .bind(userId)
    .all<{ id: string; name: string }>();

  // Get user's categories
  const categories = await db
    .prepare(
      `SELECT id, name FROM categories
       WHERE user_id = ?
       ORDER BY name`
    )
    .bind(userId)
    .all<{ id: string; name: string }>();

  return {
    accounts: accounts.results || [],
    categories: categories.results || [],
  };
}

/**
 * Action: Process CSV import
 */
export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);
  const db = getDb(request);

  const formData = await request.formData();
  const intent = formData.get("intent");

  // AI column mapping
  if (intent === "map-columns") {
    const headersJson = formData.get("headers");
    if (!headersJson || typeof headersJson !== "string") {
      return Response.json({ error: "Headers are required" }, { status: 400 });
    }

    try {
      const headers = JSON.parse(headersJson) as string[];
      const mapping = await CsvImportService.detectColumnMapping(
        request,
        headers
      );

      return Response.json({ mapping });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error ? error.message : "Failed to map columns",
        },
        { status: 500 }
      );
    }
  }

  // Validate CSV
  if (intent === "validate") {
    const fileJson = formData.get("file");
    if (!fileJson || typeof fileJson !== "string") {
      return Response.json({ error: "File data is required" }, { status: 400 });
    }

    try {
      const fileData = JSON.parse(fileJson) as { name: string; size: number };
      const file = new File([], fileData.name, {
        type: "text/csv",
        lastModified: Date.now(),
      });

      // Create a mock File with size
      Object.defineProperty(file, "size", { value: fileData.size });

      const validation = await CsvImportService.validateCsvFile(file);
      return Response.json(validation);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Validation failed" },
        { status: 500 }
      );
    }
  }

  // Parse CSV
  if (intent === "parse") {
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ error: "File is required" }, { status: 400 });
    }

    try {
      const parsedData = await CsvImportService.parseCSV(file);
      return Response.json(parsedData);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Failed to parse CSV" },
        { status: 500 }
      );
    }
  }

  // Import transactions
  if (intent === "import") {
    const rowsJson = formData.get("rows");
    const mappingJson = formData.get("mapping");
    const optionsJson = formData.get("options");

    if (!rowsJson || !mappingJson || !optionsJson) {
      return Response.json(
        { error: "Rows, mapping, and options are required" },
        { status: 400 }
      );
    }

    try {
      const rows = JSON.parse(rowsJson as string);
      const mapping = JSON.parse(mappingJson as string) as ColumnMapping;
      const options = JSON.parse(optionsJson as string) as ImportOptions;

      const result = await CsvImportService.importTransactions(
        db,
        userId,
        rows,
        mapping,
        options
      );

      return Response.json(result);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Import failed" },
        { status: 500 }
      );
    }
  }

  return Response.json({ error: "Invalid intent" }, { status: 400 });
}
