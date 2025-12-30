/**
 * PDF Styles and Fonts
 * Provides consistent styling for PDF documents with Vietnamese font support
 */

import { Font, StyleSheet } from "@react-pdf/renderer";

// Register Roboto font for Vietnamese character support
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/roboto/v32/KFOkCnqEu92Fr1Mu51xFIzIFKw.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmSU5fCRc4EsA.woff2",
      fontWeight: 700,
    },
    {
      src: "https://fonts.gstatic.com/s/roboto/v32/KFOjCnqEu92Fr1Mu51TzBic6CsI.woff2",
      fontWeight: 400,
      fontStyle: "italic",
    },
  ],
});

// Color palette
export const colors = {
  primary: "#3b82f6",
  secondary: "#64748b",
  success: "#22c55e",
  danger: "#ef4444",
  warning: "#f59e0b",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
  background: "#f8fafc",
  white: "#ffffff",
};

// PDF Styles
export const styles = StyleSheet.create({
  // Page
  page: {
    padding: 30,
    fontFamily: "Roboto",
    fontSize: 10,
    color: colors.text,
    backgroundColor: colors.white,
  },

  // Header
  header: {
    marginBottom: 20,
    paddingBottom: 10,
    borderBottom: `1 solid ${colors.border}`,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerLeft: {
    flex: 1,
  },

  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },

  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 5,
    color: colors.text,
  },

  subtitle: {
    fontSize: 12,
    color: colors.textLight,
  },

  reportDate: {
    fontSize: 10,
    color: colors.textLight,
    marginTop: 5,
  },

  // Sections
  section: {
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 10,
    color: colors.text,
    paddingBottom: 5,
    borderBottom: `1 solid ${colors.border}`,
  },

  sectionSubtitle: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 10,
    marginBottom: 8,
    color: colors.text,
  },

  // Cards and boxes
  card: {
    backgroundColor: colors.background,
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },

  cardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  cardLabel: {
    color: colors.textLight,
    fontSize: 9,
  },

  cardValue: {
    fontWeight: 700,
    fontSize: 11,
  },

  cardValueLarge: {
    fontSize: 18,
    fontWeight: 700,
  },

  // Summary cards
  summaryCards: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    gap: 10,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 4,
    padding: 10,
  },

  summaryCardLabel: {
    fontSize: 9,
    color: colors.textLight,
    marginBottom: 5,
  },

  summaryCardValue: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 2,
  },

  summaryCardChange: {
    fontSize: 8,
    fontWeight: 400,
  },

  positive: {
    color: colors.success,
  },

  negative: {
    color: colors.danger,
  },

  neutral: {
    color: colors.textLight,
  },

  // Tables
  table: {
    width: "100%",
    marginBottom: 10,
  },

  tableRow: {
    flexDirection: "row",
    borderBottom: `1 solid ${colors.border}`,
    minHeight: 20,
  },

  tableHeader: {
    backgroundColor: colors.background,
    fontWeight: 700,
    fontSize: 9,
    color: colors.text,
  },

  tableCell: {
    padding: 5,
    fontSize: 9,
  },

  tableCellSmall: {
    padding: 5,
    fontSize: 8,
  },

  tableCellRight: {
    padding: 5,
    fontSize: 9,
    textAlign: "right",
  },

  // Column widths
  colDate: { width: "15%" },
  colDescription: { width: "35%" },
  colCategory: { width: "20%" },
  colAccount: { width: "15%" },
  colAmount: { width: "15%", textAlign: "right" as const },

  colCategoryName: { width: "40%" },
  colAmount2: { width: "20%", textAlign: "right" as const },
  colPercentage: { width: "15%", textAlign: "right" as const },
  colCount: { width: "10%", textAlign: "right" as const },
  colAvg: { width: "15%", textAlign: "right" as const },

  colMonth: { width: "20%" },
  colIncome: { width: "20%", textAlign: "right" as const },
  colExpense: { width: "20%", textAlign: "right" as const },
  colNet: { width: "20%", textAlign: "right" as const },
  colBalance: { width: "20%", textAlign: "right" as const },

  // Total row
  totalRow: {
    backgroundColor: colors.background,
    fontWeight: 700,
    borderTop: `2 solid ${colors.border}`,
  },

  // Lists
  listItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: `1 solid ${colors.border}`,
  },

  listItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },

  listItemTitle: {
    fontSize: 10,
    fontWeight: 700,
  },

  listItemAmount: {
    fontSize: 10,
    fontWeight: 700,
  },

  listItemSubtitle: {
    fontSize: 8,
    color: colors.textLight,
  },

  // Charts (simple bars)
  chartContainer: {
    marginBottom: 10,
  },

  chartTitle: {
    fontSize: 10,
    fontWeight: 700,
    marginBottom: 8,
  },

  barChart: {
    marginBottom: 5,
  },

  barRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  barLabel: {
    width: "30%",
    fontSize: 8,
  },

  barContainer: {
    flex: 1,
    height: 12,
    backgroundColor: colors.background,
    borderRadius: 2,
    overflow: "hidden",
    marginLeft: 5,
  },

  barFill: {
    height: "100%",
    borderRadius: 2,
  },

  barValue: {
    width: "15%",
    fontSize: 8,
    textAlign: "right" as const,
    marginLeft: 5,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: colors.textLight,
    borderTop: `1 solid ${colors.border}`,
    paddingTop: 10,
  },

  pageNumber: {
    fontSize: 8,
    color: colors.textLight,
  },

  // Utility classes
  textSmall: {
    fontSize: 8,
  },

  textMedium: {
    fontSize: 10,
  },

  textLarge: {
    fontSize: 12,
  },

  bold: {
    fontWeight: 700,
  },

  uppercase: {
    textTransform: "uppercase" as const,
  },

  center: {
    textAlign: "center" as const,
  },

  right: {
    textAlign: "right" as const,
  },

  mb5: {
    marginBottom: 5,
  },

  mb10: {
    marginBottom: 10,
  },

  mt5: {
    marginTop: 5,
  },

  mt10: {
    marginTop: 10,
  },

  // Badge styles
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    fontSize: 7,
    fontWeight: 700,
  },

  badgeSuccess: {
    backgroundColor: "#dcfce7",
    color: "#166534",
  },

  badgeWarning: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },

  badgeDanger: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap" as const,
    marginHorizontal: -5,
  },

  gridItem: {
    width: "50%",
    paddingHorizontal: 5,
  },

  gridItemThird: {
    width: "33.33%",
    paddingHorizontal: 5,
  },
});

// Helper functions for PDF styling
export function formatCurrency(amount: number, currency: string = "VND"): string {
  if (currency === "VND") {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatMonth(year: number, month: number): string {
  return new Intl.DateTimeFormat("vi-VN", {
    year: "numeric",
    month: "long",
  }).format(new Date(year, month - 1));
}

export function getBarColor(value: number, _maxValue: number): string {
  if (value > 0) {
    return colors.success;
  } else if (value < 0) {
    return colors.danger;
  } else {
    return colors.secondary;
  }
}

export function calculateBarWidth(value: number, maxValue: number): number {
  return Math.min((Math.abs(value) / maxValue) * 100, 100);
}
