/**
 * CreditCardStatement Component
 * PDF document for credit card statement
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

export interface CreditCardStatementData {
  card: {
    id: string;
    name: string;
    account_number_last4?: string | null;
    currency: string;
  };
  statement: {
    cycle_start_date: Date;
    cycle_end_date: Date;
    statement_date: Date;
    due_date: Date;
    opening_balance: number;
    closing_balance: number;
    total_charges: number;
    total_payments: number;
    total_fees: number;
    minimum_payment: number | null;
    payment_status: string;
    amount_paid: number;
  };
  transactions: Array<{
    date: Date;
    description: string;
    amount: number;
    categoryName?: string;
    status: string;
  }>;
}

interface CreditCardStatementProps {
  data: CreditCardStatementData;
}

export function CreditCardStatement({ data }: CreditCardStatementProps) {
  const { card, statement, transactions } = data;

  // Prepare transaction table columns
  const transactionColumns = [
    { key: "date", label: "Date", width: "12%" },
    { key: "description", label: "Description", width: "38%" },
    { key: "category", label: "Category", width: "20%" },
    { key: "status", label: "Status", width: "12%" },
    { key: "amount", label: "Amount", width: "18%", align: "right" as const },
  ];

  // Split transactions into pages (50 per page)
  const transactionsPerPage = 50;
  const pages = [];
  for (let i = 0; i < transactions.length; i += transactionsPerPage) {
    pages.push(transactions.slice(i, i + transactionsPerPage));
  }

  const transactionRows = transactions.map((t) => ({
    date: formatDate(t.date),
    description: t.description,
    category: t.categoryName || "-",
    status: t.status,
    amount: formatCurrency(t.amount, card.currency),
  }));

  // Get status badge style
  const getStatusStyle = (status: string) => {
    switch (status.toUpperCase()) {
      case "PAID":
        return styles.badgeSuccess;
      case "PARTIAL":
        return styles.badgeWarning;
      case "UNPAID":
        return styles.badgeDanger;
      default:
        return styles.badge;
    }
  };

  const remainingBalance = statement.closing_balance - statement.amount_paid;

  return (
    <Document>
      {/* Cover Page - Statement Summary */}
      <Page size="A4" style={styles.page}>
        <PDFHeader
          title="Credit Card Statement"
          subtitle={`${card.name} ${card.account_number_last4 ? `(${card.account_number_last4})` : ""}`}
        />

        {/* Statement Period Info */}
        <PDFCard>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Statement Period</Text>
            <Text style={styles.cardValue}>
              {formatDate(statement.cycle_start_date)} - {formatDate(statement.cycle_end_date)}
            </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Statement Date</Text>
            <Text style={styles.cardValue}>{formatDate(statement.statement_date)}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Due Date</Text>
            <Text style={[styles.cardValue, styles.bold]}>{formatDate(statement.due_date)}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Payment Status</Text>
            <View style={[styles.badge, getStatusStyle(statement.payment_status)]}>
              <Text style={styles.center}>{statement.payment_status}</Text>
            </View>
          </View>
        </PDFCard>

        {/* Balance Summary Cards */}
        <View style={styles.summaryCards}>
          <PDFSummaryCard
            label="Opening Balance"
            value={formatCurrency(statement.opening_balance, card.currency)}
          />
          <PDFSummaryCard
            label="Closing Balance"
            value={formatCurrency(statement.closing_balance, card.currency)}
            changeType="negative"
          />
        </View>

        {/* Transaction Summary */}
        <View style={styles.summaryCards}>
          <PDFSummaryCard
            label="Total Charges"
            value={formatCurrency(statement.total_charges, card.currency)}
            changeType="negative"
          />
          <PDFSummaryCard
            label="Total Payments"
            value={formatCurrency(statement.total_payments, card.currency)}
            changeType="positive"
          />
          <PDFSummaryCard
            label="Total Fees"
            value={formatCurrency(statement.total_fees, card.currency)}
            changeType="negative"
          />
        </View>

        {/* Payment Information */}
        <View style={styles.summaryCards}>
          <PDFSummaryCard
            label="Minimum Payment"
            value={formatCurrency(statement.minimum_payment || 0, card.currency)}
          />
          <PDFSummaryCard
            label="Amount Paid"
            value={formatCurrency(statement.amount_paid, card.currency)}
            changeType="positive"
          />
          <PDFSummaryCard
            label="Remaining Balance"
            value={formatCurrency(Math.max(0, remainingBalance), card.currency)}
            changeType={remainingBalance > 0 ? "negative" : "neutral"}
          />
        </View>

        <PDFFooter />
      </Page>

      {/* Transaction Pages */}
      {pages.map((pageTransactions, pageIndex) => (
        <Page key={pageIndex} size="A4" style={styles.page}>
          <PDFHeader
            title="Transaction Details"
            subtitle={`Page ${pageIndex + 1}/${pages.length}`}
          />

          <PDFSection title="Transactions">
            <PDFTable
              columns={transactionColumns}
              data={pageTransactions.map((t) => ({
                date: formatDate(t.date),
                description: t.description,
                category: t.categoryName || "-",
                status: t.status,
                amount: formatCurrency(t.amount, card.currency),
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
