/**
 * AnnualSummary Component
 * PDF document for annual finance summary
 */

import {
  Document,
  Page,
  Text,
  View,
} from "@react-pdf/renderer";
import { PDFHeader } from "./PDFHeader";
import { PDFFooter } from "./PDFFooter";
import { PDFSection, PDFCard, PDFSummaryCard } from "./PDFSection";
import { SimpleBarChart } from "./SimpleBarChart";
import { PDFTable } from "./PDFTable";
import { styles, formatCurrency, formatDate } from "~/lib/services/pdf-styles";
import type { AnnualReportData } from "~/lib/db/reports.server";

interface AnnualSummaryProps {
  data: AnnualReportData;
  currency?: string;
}

export function AnnualSummary({ data, currency = "VND" }: AnnualSummaryProps) {
  const { year, summary, monthlyTrends, categoryBreakdown, accountSummaries } = data;

  // Prepare monthly trend data
  const monthlyData = monthlyTrends.map((m) => ({
    label: m.monthName,
    value: m.net,
  }));

  // Prepare category data
  const categoryData = categoryBreakdown.slice(0, 10).map((c) => ({
    label: c.categoryName,
    value: c.amount,
    color: c.color || undefined,
  }));

  // Prepare monthly table data
  const monthlyColumns = [
    { key: "month", label: "Month", width: "20%" },
    { key: "income", label: "Income", width: "20%", align: "right" as const },
    { key: "expense", label: "Expenses", width: "20%", align: "right" as const },
    { key: "net", label: "Net", width: "20%", align: "right" as const },
    { key: "balance", label: "Balance", width: "20%", align: "right" as const },
  ];

  const monthlyRows = monthlyTrends.map((m) => ({
    month: m.monthName,
    income: formatCurrency(m.income, currency),
    expense: formatCurrency(m.expenses, currency),
    net: formatCurrency(m.net, currency),
    balance: formatCurrency(m.balance, currency),
  }));

  // Prepare account table data
  const accountColumns = [
    { key: "account", label: "Account", width: "30%" },
    { key: "opening", label: "Opening", width: "20%", align: "right" as const },
    { key: "closing", label: "Closing", width: "20%", align: "right" as const },
    { key: "change", label: "Change", width: "30%", align: "right" as const },
  ];

  const accountRows = accountSummaries.map((a) => ({
    account: `${a.accountName}\n${a.transactionCount} transactions`,
    opening: formatCurrency(a.openingBalance, currency),
    closing: formatCurrency(a.closingBalance, currency),
    change: formatCurrency(a.closingBalance - a.openingBalance, currency),
  }));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          title="Annual Finance Summary"
          subtitle={`Year ${year}`}
        />

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <PDFSummaryCard
            label="Total Income"
            value={formatCurrency(summary.totalIncome, currency)}
            changeType="positive"
          />
          <PDFSummaryCard
            label="Total Expenses"
            value={formatCurrency(summary.totalExpenses, currency)}
            changeType="negative"
          />
          <PDFSummaryCard
            label="Net Flow"
            value={formatCurrency(summary.netFlow, currency)}
            changeType={summary.netFlow >= 0 ? "positive" : "negative"}
          />
          <PDFSummaryCard
            label="Transactions"
            value={summary.transactionCount.toString()}
          />
        </View>

        {/* Year Overview */}
        <PDFCard>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Opening Balance</Text>
            <Text style={styles.cardValue}>
              {formatCurrency(summary.openingBalance, currency)}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Closing Balance</Text>
            <Text style={styles.cardValue}>
              {formatCurrency(summary.closingBalance, currency)}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Net Worth Change</Text>
            <Text style={[styles.cardValue, summary.netWorthChange >= 0 ? styles.positive : styles.negative]}>
              {formatCurrency(summary.netWorthChange, currency)}
            </Text>
          </View>
        </PDFCard>

        {/* Averages */}
        <View style={styles.summaryCards}>
          <PDFSummaryCard
            label="Avg Monthly Income"
            value={formatCurrency(summary.averageMonthlyIncome, currency)}
          />
          <PDFSummaryCard
            label="Avg Monthly Expenses"
            value={formatCurrency(summary.averageMonthlyExpenses, currency)}
          />
          <PDFSummaryCard
            label="Avg Monthly Net"
            value={formatCurrency(summary.netFlow / 12, currency)}
            changeType={summary.netFlow >= 0 ? "positive" : "negative"}
          />
        </View>

        <PDFFooter />
      </Page>

      {/* Second Page - Monthly Trends */}
      <Page size="A4" style={styles.page}>
        <PDFHeader
          title="Annual Finance Summary"
          subtitle="Monthly Trends"
        />

        <PDFSection title="Monthly Net Flow">
          <SimpleBarChart
            data={monthlyData}
            height={10}
          />
        </PDFSection>

        <PDFSection title="Monthly Breakdown">
          <PDFTable
            columns={monthlyColumns}
            data={monthlyRows}
          />
        </PDFSection>

        <PDFFooter />
      </Page>

      {/* Third Page - Category & Account Summary */}
      <Page size="A4" style={styles.page}>
        <PDFHeader
          title="Annual Finance Summary"
          subtitle="Categories & Accounts"
        />

        <PDFSection title="Top Expense Categories">
          <SimpleBarChart
            data={categoryData}
          />
        </PDFSection>

        <PDFSection title="Account Summaries">
          <PDFTable
            columns={accountColumns}
            data={accountRows}
          />
        </PDFSection>

        <PDFFooter />
      </Page>
    </Document>
  );
}
