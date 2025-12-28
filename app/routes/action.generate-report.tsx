/**
 * Report Generation Action Route
 * Server-side action to generate report data
 */

import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { requireUserId } from "../lib/auth/auth.server";
import {
  getMonthlyReportData,
  getAnnualReportData,
  getCategoryBreakdownData,
  getAccountStatementData,
  createReportRecord,
} from "../lib/db/reports.server";
import type { ReportType, ReportHistoryMetadata } from "../lib/db/reports.server";

/**
 * Handle report generation request
 */
export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireUserId(request);

  const formData = await request.formData();
  const reportType = formData.get("reportType") as ReportType;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const accountId = formData.get("accountId") as string | null;
  const categoryType = formData.get("categoryType") as "INCOME" | "EXPENSE" | null;
  const currency = formData.get("currency") as string || "VND";

  if (!reportType) {
    return Response.json({ error: "Report type is required" }, { status: 400 });
  }

  if (!startDate || !endDate) {
    return Response.json({ error: "Date range is required" }, { status: 400 });
  }

  try {
    let reportData;
    let title: string;
    const start = new Date(startDate);
    const end = new Date(endDate);

    switch (reportType) {
      case "monthly": {
        const year = parseInt(startDate.substring(0, 4));
        const month = parseInt(startDate.substring(5, 7));
        const monthName = start.toLocaleString("default", { month: "long" });
        title = `${monthName} ${year} Monthly Report`;
        reportData = await getMonthlyReportData(request, userId, year, month);
        break;
      }

      case "annual": {
        const year = parseInt(startDate.substring(0, 4));
        title = `${year} Annual Report`;
        reportData = await getAnnualReportData(request, userId, year);
        break;
      }

      case "category": {
        title = `Category Breakdown (${startDate} to ${endDate})`;
        reportData = await getCategoryBreakdownData(
          request,
          userId,
          start,
          end,
          categoryType || undefined
        );
        break;
      }

      case "account": {
        if (!accountId) {
          return Response.json({ error: "Account ID is required for account statement" }, { status: 400 });
        }
        // Get account name for title
        const db = (await import("~/lib/auth/db.server")).getDb(request);
        const accountResult = await db
          .prepare(`SELECT name FROM financial_accounts WHERE id = ? AND user_id = ?`)
          .bind(accountId, userId)
          .first<{ name: string }>();

        const accountName = accountResult?.name || "Unknown Account";
        title = `${accountName} Statement (${startDate} to ${endDate})`;

        reportData = await getAccountStatementData(request, userId, accountId, start, end);
        break;
      }

      default:
        return Response.json({ error: "Invalid report type" }, { status: 400 });
    }

    // Create report history record
    const metadata: ReportHistoryMetadata = {
      filters: {
        categoryIds: [],
        accountIds: accountId ? [accountId] : [],
        includePending: false,
      },
      options: {
        includeCharts: true,
        format: "pdf",
      },
    };

    await createReportRecord(
      request,
      userId,
      reportType,
      title,
      start,
      end,
      undefined, // fileUrl - can be added later when uploading to R2
      metadata
    );

    return Response.json({
      success: true,
      data: reportData,
      options: { currency },
    });
  } catch (error) {
    console.error("Error generating report:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to generate report" },
      { status: 500 }
    );
  }
}

/**
 * Get filter options for report generation
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  // Get available accounts and categories
  const db = (await import("~/lib/auth/db.server")).getDb(request);

  const [accountsResult, categoriesResult] = await Promise.all([
    db
      .prepare(
        `SELECT id, name, type, currency FROM financial_accounts
         WHERE user_id = ? AND is_archived = 0
         ORDER BY name`
      )
      .bind(userId)
      .all<{ id: string; name: string; type: string; currency: string }>(),
    db
      .prepare(
        `SELECT id, name, type FROM categories
         WHERE user_id = ?
         ORDER BY type, name`
      )
      .bind(userId)
      .all<{ id: string; name: string; type: string }>(),
  ]);

  return ({
    accounts: accountsResult.results || [],
    categories: categoriesResult.results || [],
  });
}
