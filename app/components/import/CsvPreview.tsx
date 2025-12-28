/**
 * CsvPreview Component
 * Preview first N rows of CSV data with mapped columns
 */

import { useTranslation } from "react-i18next";
import { Card } from "~/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import type { CsvRow } from "~/lib/types/csv-import";

interface CsvPreviewProps {
  headers: string[];
  rows: CsvRow[];
  mappedColumns: string[];
  maxRows?: number;
}

export function CsvPreview({
  headers,
  rows,
  mappedColumns,
  maxRows = 10,
}: CsvPreviewProps) {
  const { t } = useTranslation();

  const displayRows = rows.slice(0, maxRows);

  // Determine which columns to show (mapped columns first, then others)
  const displayColumns = [
    ...mappedColumns.filter((h) => headers.includes(h)),
    ...headers.filter((h) => !mappedColumns.includes(h)),
  ];

  return (
    <Card className="p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          {t("import.csv.preview.title", "Preview")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("import.csv.preview.showing", "Showing first {{count}} rows", {
            count: displayRows.length,
          })}{" "}
          {rows.length > maxRows &&
            t("import.csv.preview.ofTotal", "of {{total}} total", {
              total: rows.length,
            })}
        </p>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              {displayColumns.map((column) => (
                <TableHead key={column} className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {column}
                    {mappedColumns.includes(column) && (
                      <Badge variant="secondary" className="text-xs">
                        {t("import.csv.preview.mapped", "Mapped")}
                      </Badge>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell className="text-muted-foreground font-mono text-sm">
                  {rowIndex + 1}
                </TableCell>
                {displayColumns.map((column) => (
                  <TableCell key={column} className="max-w-xs truncate">
                    {row[column] || (
                      <span className="text-muted-foreground italic">
                        {t("import.csv.preview.empty", "(empty)")}
                      </span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {t("import.csv.preview.noData", "No data to preview")}
        </div>
      )}
    </Card>
  );
}
