/**
 * ImportSummary Component
 * Summary of what will be imported with validation results
 */

import { useI18n } from "~/lib/i18n/client";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import type { ImportResult } from "~/lib/types/csv-import";

interface ImportSummaryProps {
  result: ImportResult | null;
  rowCount: number;
  isImporting?: boolean;
  onConfirm: () => void;
  onBack?: () => void;
}

export function ImportSummary({
  result,
  rowCount,
  isImporting = false,
  onConfirm,
  onBack,
}: ImportSummaryProps) {
  const { t } = useI18n();

  if (!result) {
    return null;
  }

  const hasErrors = result.errors.length > 0;
  const hasWarnings = result.warnings.length > 0;
  const canImport = result.duplicates < rowCount && !hasErrors;

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">
          {t("import.csv.summary.title", "Import Summary")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            "import.csv.summary.subtitle",
            "Review what will be imported before confirming"
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <p className="text-2xl font-bold">{rowCount}</p>
          <p className="text-sm text-muted-foreground">
            {t("import.csv.summary.totalRows", "Total Rows")}
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-bold text-green-600">
            {result.duplicates > 0 ? rowCount - result.duplicates : rowCount}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("import.csv.summary.toBeImported", "To Import")}
          </p>
        </div>

        {result.duplicates > 0 && (
          <div className="space-y-1">
            <p className="text-2xl font-bold text-yellow-600">
              {result.duplicates}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("import.csv.summary.duplicates", "Duplicates")}
            </p>
          </div>
        )}

        {result.errors.length > 0 && (
          <div className="space-y-1">
            <p className="text-2xl font-bold text-destructive">
              {result.errors.length}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("import.csv.summary.errors", "Errors")}
            </p>
          </div>
        )}
      </div>

      {/* Errors */}
      {hasErrors && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="h-4 w-4" />
            <h4 className="font-semibold">
              {t("import.csv.summary.errorsTitle", "Errors")}
            </h4>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {result.errors.slice(0, 10).map((error) => (
              <div
                key={`${error.row}-${error.field}`}
                className="text-sm bg-destructive/10 rounded px-3 py-2"
              >
                <span className="font-medium">
                  {t("import.csv.summary.row", "Row")} {error.row}:
                </span>{" "}
                {error.message}
              </div>
            ))}
            {result.errors.length > 10 && (
              <p className="text-sm text-muted-foreground">
                {t(
                  "import.csv.summary.moreErrors",
                  "...and {{count}} more errors",
                  { count: result.errors.length - 10 }
                )}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {hasWarnings && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertCircle className="h-4 w-4" />
            <h4 className="font-semibold">
              {t("import.csv.summary.warningsTitle", "Warnings")}
            </h4>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {result.warnings.slice(0, 5).map((warning) => (
              <div
                key={`${warning.row}-${warning.field}`}
                className="text-sm bg-yellow-500/10 rounded px-3 py-2"
              >
                <span className="font-medium">
                  {t("import.csv.summary.row", "Row")} {warning.row}:
                </span>{" "}
                {warning.message}
              </div>
            ))}
            {result.warnings.length > 5 && (
              <p className="text-sm text-muted-foreground">
                {t(
                  "import.csv.summary.moreWarnings",
                  "...and {{count}} more warnings",
                  { count: result.warnings.length - 5 }
                )}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Success message */}
      {!hasErrors && canImport && (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <p className="text-sm">
            {t(
              "import.csv.summary.ready",
              "Ready to import {{count}} transactions",
              { count: rowCount - result.duplicates }
            )}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={onConfirm}
          disabled={!canImport || isImporting}
          className="flex-1"
        >
          {isImporting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t("import.csv.summary.importing", "Importing...")}
            </>
          ) : (
            t("import.csv.summary.confirm", "Confirm Import")
          )}
        </Button>
        {onBack && (
          <Button variant="outline" onClick={onBack} disabled={isImporting}>
            {t("import.csv.summary.back", "Back")}
          </Button>
        )}
      </div>
    </Card>
  );
}
