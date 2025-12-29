/**
 * API Route: Transaction Exports
 *
 * Provides endpoints for exporting transactions to various formats.
 * Supports CSV, Excel, and JSON exports with filtering options.
 */

import type { LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import {
  exportTransactions,
  getExportMetadata,
  type ExportOptions,
  type ExportFormat,
  type ExportField,
} from "~/lib/services/export.server";

/**
 * GET /api/export
 * Get export metadata (available accounts, categories, date ranges)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);

  const metadata = await getExportMetadata(request, user.id);

  return Response.json({
    accounts: metadata.accounts,
    categories: metadata.categories,
    dateRange: metadata.dateRange,
    availableFormats: ["csv", "excel", "json"] as ExportFormat[],
    availableFields: [
      "date",
      "description",
      "amount",
      "currency",
      "category",
      "account",
      "status",
      "notes",
      "tags",
      "reference",
      "receiptUrl",
    ] as ExportField[],
  });
}

/**
 * POST /api/export
 * Generate and download transaction export
 *
 * Request body:
 * {
 *   "format": "csv" | "excel" | "json",
 *   "startDate": "2025-01-01",  // optional
 *   "endDate": "2025-12-31",    // optional
 *   "accountIds": ["id1", "id2"], // optional
 *   "categoryIds": ["id1"],      // optional
 *   "includeHeader": true,        // optional
 *   "fields": ["date", "amount"]  // optional
 * }
 */
export async function action({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);

  // Only accept POST requests for export generation
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();

    // Validate export format
    const format = body.format as ExportFormat;
    if (!["csv", "excel", "json"].includes(format)) {
      return Response.json(
        { error: "Invalid format. Must be csv, excel, or json" },
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build export options
    const options: ExportOptions = {
      userId: user.id,
      format,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      accountIds: body.accountIds,
      categoryIds: body.categoryIds,
      includeHeader: body.includeHeader !== false,
      fields: body.fields,
    };

    // Generate export
    const { data, filename, contentType } = await exportTransactions(request, options);

    // Return file download response
    return new Response(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return Response.json(
      { error: "Failed to generate export" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
