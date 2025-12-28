/**
 * AccountStatement Component
 * PDF document for account statement
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
import { PDFTable } from "./PDFTable";
import { styles, formatCurrency, formatDate } from "~/lib/services/pdf-styles";
import type { AccountStatementData } from "~/lib/db/reports.server";

interface AccountStatementProps {
  data: AccountStatementData;
  currency?: string;
}

export function AccountStatement({ data, currency = "VND" }: AccountStatementProps) {
  const { account, period, openingBalance, closingBalance, transactions, summary } = data;

  // Prepare transaction table columns
  const transactionColumns = [
    { key: "date", label: "Date", width: "12%" },
    { key: "description", label: "Description", width: "35%" },
    { key: "category", label: "Category", width: "20%" },
    { key: "status", label: "Status", width: "10%" },
    { key: "amount", label: "Amount", width: "23%", align: "right" as const },
  ];

  // Split transactions into pages (50 per page)
  const transactionsPerPage = 50;
  const pages = [];
  for (let i = 0; i < transactions.length; i += transactionsPerPage) {
    pages.push(transactions.slice(i, i + transactionsPerPage));
  }

  // Calculate running balance for each transaction
  const transactionsWithBalance = transactions.map((t, index) => {
    const previousBalance = index === 0 ? openingBalance :
      openingBalance + transactions.slice(0, index).reduce((sum, tr) => sum + tr.amount, 0);
    return {
      ...t,
      balance: previousBalance + t.amount,
    };
  });

  const transactionRows = transactionsWithBalance.map((t) => ({
    date: formatDate(t.date),
    description: t.description,
    category: t.categoryName || "-",
    status: t.status,
    amount: formatCurrency(t.amount, currency),
  }));

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <PDFHeader
          title="Account Statement"
          subtitle={`${account.name} (${account.type})`}
        />

        {/* Account Info */}
        <PDFCard>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Account</Text>
            <Text style={styles.cardValue}>{account.name}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Type</Text>
            <Text style={styles.cardValue}>{account.type}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Currency</Text>
            <Text style={styles.cardValue}>{account.currency}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Period</Text>
            <Text style={styles.cardValue}>
              {formatDate(period.startDate)} - {formatDate(period.endDate)}
            </Text>
          </View>
        </PDFCard>

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <PDFSummaryCard
            label="Opening Balance"
            value={formatCurrency(openingBalance, currency)}
          />
          <PDFSummaryCard
            label="Closing Balance"
            value={formatCurrency(closingBalance, currency)}
            changeType={closingBalance >= openingBalance ? "positive" : "negative"}
          />
        </View>

        <View style={styles.summaryCards}>
          <PDFSummaryCard
            label="Total Credits"
            value={formatCurrency(summary.totalCredits, currency)}
            changeType="positive"
          />
          <PDFSummaryCard
            label="Total Debits"
            value={formatCurrency(summary.totalDebits, currency)}
            changeType="negative"
          />
          <PDFSummaryCard
            label="Net Change"
            value={formatCurrency(summary.totalCredits - summary.totalDebits, currency)}
            changeType={summary.totalCredits >= summary.totalDebits ? "positive" : "negative"}
          />
        </View>

        <View style={styles.summaryCards}>
          <PDFSummaryCard
            label="Transactions"
            value={summary.transactionCount.toString()}
          />
        </View>

        <PDFFooter />
      </Page>

      {/* Transaction Pages */}
      {pages.map((pageTransactions, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <PDFHeader
            title="Account Statement"
            subtitle={`Transactions (Page ${pageIndex + 1}/${pages.length})`}
          />

          <PDFSection title="Transaction List">
            <PDFTable
              columns={transactionColumns}
              data={pageTransactions.map((t) => ({
                date: formatDate(t.date),
                description: t.description,
                category: t.categoryName || "-",
                status: t.status,
                amount: formatCurrency(t.amount, currency),
              }))}
            />
          </PDFSection>

          {/* Page Summary */}
          <PDFCard>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>
                Showing {pageIndex * transactionsPerPage + 1} - {Math.min((pageIndex + 1) * transactionsPerPage, transactions.length)} of {transactions.length} transactions
              </Text>
            </View>
          </PDFCard>

          <PDFFooter />
        </Page>
      ))}
    </Document>
  );
}
