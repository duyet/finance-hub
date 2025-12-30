/**
 * CsvDropzone Component
 * Drag and drop file upload zone for CSV files
 */

import { useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { useI18n } from "~/lib/i18n/client";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";

interface CsvDropzoneProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  error?: string;
  isLoading?: boolean;
}

export function CsvDropzone({
  file,
  onFileSelect,
  onFileRemove,
  error,
  isLoading = false,
}: CsvDropzoneProps) {
  const { t } = useI18n();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = Array.from(e.dataTransfer.files);
      const csvFile = files.find((f) =>
        f.name.endsWith(".csv") || f.type === "text/csv"
      );

      if (csvFile) {
        onFileSelect(csvFile);
      }
    },
    [onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [onFileSelect]
  );

  if (file) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          </div>
          {!isLoading && (
            <Button variant="ghost" size="icon" onClick={onFileRemove}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
      >
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileInput}
          className="hidden"
          id="csv-upload"
          disabled={isLoading}
        />
        <label htmlFor="csv-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                {t("import.csv.dropzone.title", "Drop CSV file here")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("import.csv.dropzone.subtitle", "or click to browse")}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("import.csv.dropzone.accepted", "Accepted: .csv files up to 10MB")}
            </p>
          </div>
        </label>
      </div>
      {error && (
        <p className="text-sm text-destructive mt-2 text-center">{error}</p>
      )}
    </Card>
  );
}
