/**
 * CategoryBreakdown Component
 * PDF document for category breakdown report
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
import { SimpleBarChart, SimpleHorizontalBar } from "./SimpleBarChart";
import { PDFTable } from "./PDFTable";
import { styles, formatCurrency, formatDate } from "~/lib/services/pdf-styles";
import type { CategoryBreakdownData } from "~/lib/db/reports.server";

interface CategoryBreakdownProps {
  data: CategoryBreakdownData;
  currency?: string;
}

export function CategoryBreakdown({ data, currency = "VND" }: CategoryBreakdownProps) {
  const { period, categories, totalAmount, transactionCount } = data;

  // Prepare chart data
  const chartData = categories.slice(0, 15).map((c) => ({
    label: c.categoryName,
    value: c.amount,
    color: c.color || undefined,
  }));

  // Prepare category table columns
  const categoryColumns = [
    { key: "category", label: "Category", width: "35%" },
    { key: "amount", label: "Amount", width: "20%", align: "right" as const },
    { key: "percentage", label: "%", width: "15%", align: "right" as const },
    { key: "count", label: "Count", width: "15%", align: "right" as const },
    { key: "average", label: "Avg", width: "15%", align: "right" as const },
  ];

  const categoryRows = categories.map((c) => ({
    category: `${c.categoryName}\n(${c.categoryType})`,
    amount: formatCurrency(c.amount, currency),
    percentage: `${c.percentage}%`,
    count: c.transactionCount.toString(),
    average: formatCurrency(c.averagePerTransaction, currency),
  }));

  // Prepare top transactions per category
  const topTransactionsColumns = [
    { key: "date", label: "Date", width: "12%" },
    { key: "description", label: "Description", width: "38%" },
    { key: "category", label: "Category", width: "25%" },
    { key: "amount", label: "Amount", width: "25%", align: "right" as const },
  ];

  // Collect all top transactions from categories
  const allTopTransactions = categories.slice(0, 5).flatMap((cat) =>
    cat.topTransactions.map((t) => ({
      date: formatDate(t.date),
      description: t.description,
      category: cat.categoryName,
      amount: formatCurrency(t.amount, currency),
    }))
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <PDFHeader
          title="Category Breakdown Report"
          subtitle={`${formatDate(period.startDate)} - ${formatDate(period.endDate)}`}
        />

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <PDFSummaryCard
            label="Total Amount"
            value={formatCurrency(totalAmount, currency)}
          />
          <PDFSummaryCard
            label="Categories"
            value={categories.length.toString()}
          />
          <PDFSummaryCard
            label="Transactions"
            value={transactionCount.toString()}
          />
          <PDFSummaryCard
            label="Avg per Transaction"
            value={formatCurrency(totalAmount / transactionCount, currency)}
          />
        </View>

        {/* Category Distribution Chart */}
        <PDFSection title="Category Distribution">
          <SimpleHorizontalBar data={chartData.slice(0, 8)} />
        </PDFSection>

        {/* Category Table */}
        <PDFSection title="Category Details">
          <PDFTable
            columns={categoryColumns}
            data={categoryRows}
          />
        </PDFSection>

        <PDFFooter />
      </Page>

      {/* Second Page - Top Transactions */}
      {allTopTransactions.length > 0 && (
        <Page size="A4" style={styles.page}>
          <PDFHeader
            title="Category Breakdown Report"
            subtitle="Top Transactions by Category"
          />

          <PDFSection title="Highest Value Transactions">
            <PDFTable
              columns={topTransactionsColumns}
              data={allTopTransactions.slice(0, 30)}
            />
          </PDFSection>

          <PDFFooter />
        </Page>
      )}
    </Document>
  );
}
