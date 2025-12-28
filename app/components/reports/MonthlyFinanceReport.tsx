/**
 * MonthlyFinanceReport Component
 * PDF document for monthly finance report
 */

import {
  Document,
  Page,
  Text,
  View,
  Font,
} from "@react-pdf/renderer";
import { PDFHeader } from "./PDFHeader";
import { PDFFooter } from "./PDFFooter";
import { PDFSection, PDFCard, PDFSummaryCard } from "./PDFSection";
import { SimpleBarChart } from "./SimpleBarChart";
import { PDFTable } from "./PDFTable";
import { styles, formatCurrency, formatMonth, formatDate } from "~/lib/services/pdf-styles";
import type { MonthlyReportData } from "~/lib/db/reports.server";

Font.register({
  family: "Roboto",
  src: "https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Mu5mxKOzY.woff2",
});

interface MonthlyFinanceReportProps {
  data: MonthlyReportData;
  currency?: string;
}

export function MonthlyFinanceReport({ data, currency = "VND" }: MonthlyFinanceReportProps) {
  const { period, summary, dailyBreakdown, categoryBreakdown, topExpenses, topIncome } = data;

  // Prepare chart data
  const chartData = dailyBreakdown.slice(0, 10).map((d) => ({
    label: new Date(d.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
    value: d.net,
  }));

  // Prepare category data for horizontal bars
  const categoryData = categoryBreakdown.slice(0, 8).map((c) => ({
    label: c.categoryName,
    value: c.amount,
    color: c.color || undefined,
  }));

  // Prepare transaction table data
  const transactionColumns = [
    { key: "date", label: "Date", width: "15%" },
    { key: "description", label: "Description", width: "40%" },
    { key: "category", label: "Category", width: "25%" },
    { key: "amount", label: "Amount", width: "20%", align: "right" as const },
  ];

  const expenseTransactions = topExpenses.map((t) => ({
    date: formatDate(t.date),
    description: t.description,
    category: t.categoryName || "-",
    amount: formatCurrency(t.amount, currency),
  }));

  const incomeTransactions = topIncome.map((t) => ({
    date: formatDate(t.date),
    description: t.description,
    category: t.categoryName || "-",
    amount: formatCurrency(t.amount, currency),
  }));

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          title="Monthly Finance Report"
          subtitle={formatMonth(period.year, period.month)}
        />

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <PDFSummaryCard
            label="Opening Balance"
            value={formatCurrency(summary.openingBalance, currency)}
          />
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
            change={summary.netFlow >= 0 ? "+" : ""}
            changeType={summary.netFlow >= 0 ? "positive" : "negative"}
          />
        </View>

        {/* Net Worth Change */}
        <PDFCard>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Net Worth Change</Text>
            <Text style={[styles.cardValueLarge, summary.netWorthChange >= 0 ? styles.positive : styles.negative]}>
              {formatCurrency(summary.netWorthChange, currency)}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Closing Balance</Text>
            <Text style={styles.cardValue}>
              {formatCurrency(summary.closingBalance, currency)}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Transactions</Text>
            <Text style={styles.cardValue}>{summary.transactionCount}</Text>
          </View>
        </PDFCard>

        {/* Daily Trend Chart */}
        <PDFSection title="Daily Trend">
          <SimpleBarChart
            title="Net Income Flow (First 10 Days)"
            data={chartData}
          />
        </PDFSection>

        {/* Category Breakdown */}
        <PDFSection title="Expense Breakdown by Category">
          <SimpleBarChart
            title="Top Spending Categories"
            data={categoryData}
          />
        </PDFSection>

        <PDFFooter />
      </Page>

      {/* Second Page - Transaction Details */}
      <Page size="A4" style={styles.page}>
        <PDFHeader
          title="Monthly Finance Report"
          subtitle="Transaction Details"
        />

        {/* Top Expenses */}
        <PDFSection title="Top Expenses">
          <PDFTable
            columns={transactionColumns}
            data={expenseTransactions}
          />
        </PDFSection>

        {/* Top Income */}
        <PDFSection title="Top Income Sources">
          <PDFTable
            columns={transactionColumns}
            data={incomeTransactions}
          />
        </PDFSection>

        <PDFFooter />
      </Page>
    </Document>
  );
}
