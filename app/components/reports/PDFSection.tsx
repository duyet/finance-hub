/**
 * PDFSection Component
 * Renders a section with title in PDF reports
 */

import { View, Text } from "@react-pdf/renderer";
import { styles } from "~/lib/services/pdf-styles";

interface PDFSectionProps {
  title: string;
  children: React.ReactNode;
}

export function PDFSection({ title, children }: PDFSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * PDFCard Component
 * Renders a card with content
 */

interface PDFCardProps {
  children: React.ReactNode;
  style?: any;
}

export function PDFCard({ children, style }: PDFCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/**
 * PDFSummaryCard Component
 * Renders a summary stat card
 */

interface PDFSummaryCardProps {
  label: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
}

export function PDFSummaryCard({
  label,
  value,
  change,
  changeType = "neutral",
}: PDFSummaryCardProps) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryCardLabel}>{label}</Text>
      <Text style={styles.summaryCardValue}>{value}</Text>
      {change && (
        <Text
          style={[
            styles.summaryCardChange,
            changeType === "positive" ? styles.positive : null,
            changeType === "negative" ? styles.negative : null,
          ].filter((s): s is any => s !== null)}
        >
          {change}
        </Text>
      )}
    </View>
  );
}
