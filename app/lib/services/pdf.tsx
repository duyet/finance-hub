/**
 * PDF Service
 * Handles PDF document generation and download
 */

import { pdf } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import type { MonthlyReportData, AnnualReportData, CategoryBreakdownData, AccountStatementData } from "~/lib/db/reports.server";
import { MonthlyFinanceReport } from "~/components/reports/MonthlyFinanceReport";
import { AnnualSummary } from "~/components/reports/AnnualSummary";
import { CategoryBreakdown } from "~/components/reports/CategoryBreakdown";
import { AccountStatement } from "~/components/reports/AccountStatement";
import { CreditCardStatement, type CreditCardStatementData } from "~/components/reports/CreditCardStatement";

/**
 * Report options
 */
export interface ReportOptions {
  currency?: string;
  includeCharts?: boolean;
  includeTransactionList?: boolean;
}

/**
 * Report type with data
 */
export interface ReportRequest {
  type: "monthly" | "annual" | "category" | "account" | "credit_card_statement";
  data: MonthlyReportData | AnnualReportData | CategoryBreakdownData | AccountStatementData | CreditCardStatementData;
  options?: ReportOptions;
}

/**
 * Generate PDF document
 */
export async function generatePDF(request: ReportRequest): Promise<Blob> {
  const { type, data, options = {} } = request;

  let document: React.ReactElement<DocumentProps>;

  switch (type) {
    case "monthly":
      document = (
        <MonthlyFinanceReport
          data={data as MonthlyReportData}
          currency={options.currency}
        />
      );
      break;

    case "annual":
      document = (
        <AnnualSummary
          data={data as AnnualReportData}
          currency={options.currency}
        />
      );
      break;

    case "category":
      document = (
        <CategoryBreakdown
          data={data as CategoryBreakdownData}
          currency={options.currency}
        />
      );
      break;

    case "account":
      document = (
        <AccountStatement
          data={data as AccountStatementData}
          currency={options.currency}
        />
      );
      break;

    case "credit_card_statement":
      document = (
        <CreditCardStatement
          data={data as CreditCardStatementData}
        />
      );
      break;

    default:
      throw new Error(`Unknown report type: ${type}`);
  }

  // Generate PDF blob
  const blob = await pdf(document).toBlob();
  return blob;
}

/**
 * Download PDF file
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename for report
 */
export function generateReportFilename(
  type: string,
  date: Date | string,
  extra?: string
): string {
  const dateStr = typeof date === "string" ? date :
    new Date(date).toISOString().split("T")[0];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
  const extraStr = extra ? `_${extra}` : "";
  return `finance-hub_${type}${extraStr}_${timestamp}.pdf`;
}

/**
 * Generate report on client side
 */
export async function generateClientReport(
  request: ReportRequest
): Promise<{ blob: Blob; filename: string }> {
  const blob = await generatePDF(request);

  let filenameExtra = "";
  if (request.type === "monthly" && "period" in request.data) {
    const period = (request.data as MonthlyReportData).period;
    filenameExtra = `${period.year}-${period.month.toString().padStart(2, "0")}`;
  } else if (request.type === "annual" && "year" in request.data) {
    filenameExtra = (request.data as AnnualReportData).year.toString();
  } else if (request.type === "account" && "account" in request.data) {
    const account = (request.data as AccountStatementData).account;
    filenameExtra = account.name.replace(/\s+/g, "-").toLowerCase();
  } else if (request.type === "credit_card_statement" && "card" in request.data && "statement" in request.data) {
    const data = request.data as CreditCardStatementData;
    const cardName = data.card.name.replace(/\s+/g, "-").toLowerCase();
    const statementDate = new Date(data.statement.statement_date);
    const month = statementDate.toLocaleString('en-US', { month: 'short' }).toLowerCase();
    const year = statementDate.getFullYear();
    filenameExtra = `${cardName}_${month}_${year}`;
  }

  const filename = generateReportFilename(request.type, new Date(), filenameExtra);

  return { blob, filename };
}

/**
 * Generate and download report directly
 */
export async function generateAndDownloadReport(request: ReportRequest): Promise<void> {
  const { blob, filename } = await generateClientReport(request);
  downloadPDF(blob, filename);
}

/**
 * Get PDF as base64 string for embedding
 */
export async function pdfToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Get PDF data URL for preview
 */
export async function getPdfDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
