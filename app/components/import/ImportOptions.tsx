/**
 * ImportOptions Component
 * Form for import options (account, category, date format, etc.)
 */

import { useTranslation } from "react-i18next";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { Card } from "~/components/ui/card";

interface ImportOptionsProps {
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  targetAccountId?: string;
  defaultCategoryId?: string;
  dateFormat?: string;
  skipHeaderRow?: boolean;
  dryRun?: boolean;
  onTargetAccountChange: (value: string) => void;
  onDefaultCategoryChange: (value: string) => void;
  onDateFormatChange: (value: string) => void;
  onSkipHeaderRowChange: (checked: boolean) => void;
  onDryRunChange: (checked: boolean) => void;
  disabled?: boolean;
}

const DATE_FORMATS = [
  { value: "auto", label: "Auto-detect" },
  { value: "YYYY-MM-DD", label: "ISO (YYYY-MM-DD)" },
  { value: "MM/DD/YYYY", label: "US (MM/DD/YYYY)" },
  { value: "DD/MM/YYYY", label: "EU/VN (DD/MM/YYYY)" },
  { value: "DD.MM.YYYY", label: "Dot (DD.MM.YYYY)" },
  { value: "DD-MM-YYYY", label: "UK (DD-MM-YYYY)" },
];

export function ImportOptions({
  accounts,
  categories,
  targetAccountId,
  defaultCategoryId,
  dateFormat = "auto",
  skipHeaderRow = true,
  dryRun = false,
  onTargetAccountChange,
  onDefaultCategoryChange,
  onDateFormatChange,
  onSkipHeaderRowChange,
  onDryRunChange,
  disabled = false,
}: ImportOptionsProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">
          {t("import.csv.options.title", "Import Options")}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t(
            "import.csv.options.subtitle",
            "Configure how transactions should be imported"
          )}
        </p>
      </div>

      <div className="space-y-4">
        {/* Target Account */}
        <div className="space-y-2">
          <Label htmlFor="target-account">
            {t("import.csv.options.targetAccount", "Target Account")}
            <span className="text-destructive ml-1">*</span>
          </Label>
          <Select
            value={targetAccountId}
            onValueChange={onTargetAccountChange}
            disabled={disabled}
          >
            <SelectTrigger id="target-account">
              <SelectValue
                placeholder={t(
                  "import.csv.options.selectAccount",
                  "Select account..."
                )}
              />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Default Category */}
        <div className="space-y-2">
          <Label htmlFor="default-category">
            {t("import.csv.options.defaultCategory", "Default Category")}
          </Label>
          <Select
            value={defaultCategoryId}
            onValueChange={onDefaultCategoryChange}
            disabled={disabled}
          >
            <SelectTrigger id="default-category">
              <SelectValue
                placeholder={t(
                  "import.csv.options.selectCategory",
                  "Select category..."
                )}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">
                {t("import.csv.options.noCategory", "No category")}
              </SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Format */}
        <div className="space-y-2">
          <Label htmlFor="date-format">
            {t("import.csv.options.dateFormat", "Date Format")}
          </Label>
          <Select
            value={dateFormat}
            onValueChange={onDateFormatChange}
            disabled={disabled}
          >
            <SelectTrigger id="date-format">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_FORMATS.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  {format.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Checkboxes */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="skip-header"
              checked={skipHeaderRow}
              onCheckedChange={(checked) =>
                onSkipHeaderRowChange(checked as boolean)
              }
              disabled={disabled}
            />
            <Label htmlFor="skip-header" className="cursor-pointer">
              {t("import.csv.options.skipHeader", "Skip first row (header)")}
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="dry-run"
              checked={dryRun}
              onCheckedChange={(checked) => onDryRunChange(checked as boolean)}
              disabled={disabled}
            />
            <Label htmlFor="dry-run" className="cursor-pointer">
              {t(
                "import.csv.options.dryRun",
                "Dry run (preview without importing)"
              )}
            </Label>
          </div>
        </div>
      </div>
    </Card>
  );
}
