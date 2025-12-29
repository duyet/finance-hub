/**
 * Export Button Component
 *
 * Provides a button for exporting transactions with format selection.
 * Supports CSV, Excel, and JSON export formats.
 */

import { useState } from "react";
import { useFetcher } from "react-router";
import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Checkbox } from "./checkbox";
import { Label } from "./label";
import { LoaderCircle } from "lucide-react";

interface ExportButtonProps {
  disabled?: boolean;
}

interface ExportOption {
  id: string;
  label: string;
  description: string;
}

const FORMATS: ExportOption[] = [
  {
    id: "csv",
    label: "CSV",
    description: "Comma-separated values, compatible with Excel, Google Sheets",
  },
  {
    id: "excel",
    label: "Excel (CSV)",
    description: "CSV with UTF-8 BOM for better Excel compatibility",
  },
  {
    id: "json",
    label: "JSON",
    description: "Machine-readable format for developers",
  },
];

const FIELDS = [
  { id: "date", label: "Date", default: true },
  { id: "description", label: "Description", default: true },
  { id: "amount", label: "Amount", default: true },
  { id: "currency", label: "Currency", default: true },
  { id: "category", label: "Category", default: true },
  { id: "account", label: "Account", default: true },
  { id: "status", label: "Status", default: true },
  { id: "notes", label: "Notes", default: false },
  { id: "tags", label: "Tags", default: false },
  { id: "reference", label: "Reference", default: false },
  { id: "receiptUrl", label: "Receipt URL", default: false },
];

export function ExportButton({ disabled = false }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("csv");
  const [includeHeader, setIncludeHeader] = useState(true);
  const [selectedFields, setSelectedFields] = useState(
    new Set(FIELDS.filter((f) => f.default).map((f) => f.id))
  );
  const fetcher = useFetcher();

  const isPending = fetcher.state === "submitting";

  const handleExport = () => {
    if (selectedFields.size === 0) {
      return; // Require at least one field
    }

    const formData = {
      format: selectedFormat,
      includeHeader,
      fields: Array.from(selectedFields),
    };

    fetcher.submit(formData, {
      method: "POST",
      action: "/api/export",
    });

    // Close dialog after initiating export
    setTimeout(() => setOpen(false), 500);
  };

  const toggleField = (fieldId: string) => {
    const newFields = new Set(selectedFields);
    if (newFields.has(fieldId)) {
      // Don't allow deselecting all fields
      if (newFields.size > 1) {
        newFields.delete(fieldId);
      }
    } else {
      newFields.add(fieldId);
    }
    setSelectedFields(newFields);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2 h-4 w-4"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" x2="12" y1="15" y2="3" />
          </svg>
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Transactions</DialogTitle>
          <DialogDescription>
            Choose export format and fields to include in your export file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => setSelectedFormat(format.id)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    selectedFormat === format.id
                      ? "border-primary bg-primary/10"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="font-medium">{format.label}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {format.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Include Header */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="includeHeader"
              checked={includeHeader}
              onCheckedChange={setIncludeHeader}
            />
            <Label htmlFor="includeHeader" className="cursor-pointer">
              Include header row
            </Label>
          </div>

          {/* Field Selection */}
          <div className="space-y-2">
            <Label>Fields to Export</Label>
            <div className="grid grid-cols-2 gap-2">
              {FIELDS.map((field) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={selectedFields.has(field.id)}
                    onCheckedChange={() => toggleField(field.id)}
                    disabled={selectedFields.has(field.id) && selectedFields.size === 1}
                  />
                  <Label
                    htmlFor={field.id}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isPending || selectedFields.size === 0}
          >
            {isPending ? (
              <>
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-2 h-4 w-4"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
