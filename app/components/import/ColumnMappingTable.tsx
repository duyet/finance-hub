/**
 * ColumnMappingTable Component
 * Table for mapping CSV columns to standard transaction fields
 */

import { useI18n } from "~/lib/i18n/client";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";

interface ColumnMappingTableProps {
  headers: string[];
  mapping: Record<string, string>;
  onMappingChange: (field: string, value: string) => void;
  disabled?: boolean;
}

const STANDARD_FIELDS = [
  { key: "date", label: "Date", required: true },
  { key: "amount", label: "Amount", required: true },
  { key: "description", label: "Description", required: true },
  { key: "merchant", label: "Merchant", required: false },
  { key: "category", label: "Category", required: false },
  { key: "account", label: "Account", required: false },
] as const;

export function ColumnMappingTable({
  headers,
  mapping,
  onMappingChange,
  disabled = false,
}: ColumnMappingTableProps) {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">
          {t("import.csv.mapping.title", "Map Columns")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            "import.csv.mapping.subtitle",
            "Match your CSV columns to the standard transaction fields"
          )}
        </p>
      </div>

      <div className="space-y-3">
        {STANDARD_FIELDS.map((field) => (
          <div key={field.key} className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor={`map-${field.key}`} className="flex items-center gap-2">
                {field.label}
                {field.required && (
                  <Badge variant="destructive" className="text-xs">
                    {t("import.csv.mapping.required", "Required")}
                  </Badge>
                )}
              </Label>
            </div>
            <div className="flex-[2]">
              <Select
                value={mapping[field.key] || ""}
                onValueChange={(value) => onMappingChange(field.key, value)}
                disabled={disabled}
              >
                <SelectTrigger id={`map-${field.key}`}>
                  <SelectValue
                    placeholder={t(
                      "import.csv.mapping.placeholder",
                      "Select column..."
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    {t("import.csv.mapping.none", "-- None --")}
                  </SelectItem>
                  {headers.map((header) => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-muted/50 rounded-lg p-3 text-sm">
        <p className="font-medium">
          {t("import.csv.mapping.tip.title", "Tip: AI-powered mapping")}
        </p>
        <p className="text-muted-foreground mt-1">
          {t(
            "import.csv.mapping.tip.description",
            "Click the 'Auto-detect with AI' button to let AI automatically map your columns. You can still adjust the mapping afterward."
          )}
        </p>
      </div>
    </div>
  );
}
