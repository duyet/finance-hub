/**
 * PDFHeader Component
 * Renders the header section for PDF reports
 */

import { View, Text } from "@react-pdf/renderer";
import { styles, formatDate } from "~/lib/services/pdf-styles";

interface PDFHeaderProps {
  title: string;
  subtitle?: string;
  reportDate?: Date;
  rightContent?: React.ReactNode;
}

export function PDFHeader({
  title,
  subtitle,
  reportDate = new Date(),
  rightContent,
}: PDFHeaderProps) {
  return (
    <View style={styles.header} fixed>
      <View style={styles.headerLeft}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        <Text style={styles.reportDate}>
          Generated: {formatDate(reportDate)}
        </Text>
      </View>
      {rightContent && <View style={styles.headerRight}>{rightContent}</View>}
    </View>
  );
}
