/**
 * PDFTable Component
 * Renders a simple table in PDF reports
 */

import { View, Text } from "@react-pdf/renderer";
import { styles } from "~/lib/services/pdf-styles";

interface PDFTableColumn {
  key: string;
  label: string;
  width?: string | number;
  align?: "left" | "center" | "right";
}

interface PDFTableProps {
  columns: PDFTableColumn[];
  data: Record<string, React.ReactNode>[];
  showHeader?: boolean;
}

export function PDFTable({ columns, data, showHeader = true }: PDFTableProps) {
  const getColStyle = (col: PDFTableColumn) => ({
    width: col.width || "auto",
    textAlign: col.align || "left",
  });

  return (
    <View style={styles.table}>
      {showHeader && (
        <View style={[styles.tableRow, styles.tableHeader]}>
          {columns.map((col) => (
            <View key={col.key} style={getColStyle(col)}>
              <Text style={styles.tableCell}>{col.label}</Text>
            </View>
          ))}
        </View>
      )}
      {data.map((row, index) => (
        <View key={index} style={styles.tableRow}>
          {columns.map((col) => (
            <View key={col.key} style={getColStyle(col)}>
              <Text style={styles.tableCell}>{row[col.key]}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * PDFTableCell Component
 * Helper for creating table cell data
 */

interface CellData {
  date?: string;
  description?: string;
  category?: string;
  account?: string;
  amount?: string | number;
  percentage?: string;
  count?: string | number;
  avg?: string | number;
  income?: string | number;
  expense?: string | number;
  net?: string | number;
  balance?: string | number;
}

export function createTableCellData(data: CellData): Record<string, React.ReactNode> {
  return data as Record<string, React.ReactNode>;
}
