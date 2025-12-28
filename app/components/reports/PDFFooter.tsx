/**
 * PDFFooter Component
 * Renders the footer section for PDF reports
 */

import { View, Text } from "@react-pdf/renderer";
import { styles } from "~/lib/services/pdf-styles";

interface PDFFooterProps {
  text?: string;
  showPageNumber?: boolean;
}

export function PDFFooter({ text, showPageNumber = true }: PDFFooterProps) {
  return (
    <View style={styles.footer} fixed>
      <Text>{text || "Finance Hub - Personal Finance Management"}</Text>
      {showPageNumber && (
        <Text render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Page ${pageNumber} of ${totalPages}`
        } />
      )}
    </View>
  );
}
