/**
 * CSV Import Route
 * Main page for CSV file import with AI-powered column mapping
 */

import { useState, useCallback, lazy, Suspense } from "react";
import { useI18n } from "~/lib/i18n/client";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useActionData, useNavigation } from "react-router";
import { FileSpreadsheet, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Separator } from "~/components/ui/separator";
import { toast } from "~/components/ui/use-toast";
import type { ColumnMapping, ImportOptions as ImportOptionsType } from "../lib/types/csv-import";
import { action as importAction, loader as importLoader } from "./action.import-csv";

// Lazy load CSV import components for code splitting
const CsvDropzone = lazy(() =>
  import("~/components/import").then(m => ({ default: m.CsvDropzone }))
);
const ColumnMappingTable = lazy(() =>
  import("~/components/import").then(m => ({ default: m.ColumnMappingTable }))
);
const CsvPreview = lazy(() =>
  import("~/components/import").then(m => ({ default: m.CsvPreview }))
);
const ImportOptions = lazy(() =>
  import("~/components/import").then(m => ({ default: m.ImportOptions }))
);
const ImportSummary = lazy(() =>
  import("~/components/import").then(m => ({ default: m.ImportSummary }))
);
const AiMappingButton = lazy(() =>
  import("~/components/import").then(m => ({ default: m.AiMappingButton }))
);

export { importAction as action };

export async function loader(args: LoaderFunctionArgs) {
  return importLoader(args);
}

export default function CsvImportRoute() {
  const { t } = useI18n();
  const navigation = useNavigation();
  const loaderData = useLoaderData<typeof importLoader>();
  const actionData = useActionData<typeof importAction>();

  const [step, setStep] = useState<"upload" | "mapping" | "options" | "review">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<{
    headers: string[];
    rows: Array<Record<string, string>>;
  } | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [options, setOptions] = useState<ImportOptionsType>({
    targetAccountId: loaderData.accounts[0]?.id,
    defaultCategoryId: "",
    dateFormat: "auto",
    skipHeaderRow: true,
    dryRun: false,
  });
  const [importResult, setImportResult] = useState<any>(null);

  const isLoading = navigation.state === "submitting" || navigation.state === "loading";

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);

    // Parse the CSV file client-side
    const formData = new FormData();
    formData.set("intent", "parse");
    formData.set("file", selectedFile);

    try {
      const response = await fetch("/action.import-csv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to parse CSV");
      }

      const data = await response.json() as {
        error?: string;
        headers?: string[];
        previewRows?: Array<Record<string, string>>;
      };

      if (data.error) {
        toast({
          title: t("import.csv.errors.parseFailed", "Parse Failed"),
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setParsedData({
        headers: data.headers || [],
        rows: data.previewRows || [],
      });
      setStep("mapping");
    } catch (error) {
      toast({
        title: t("import.csv.errors.parseFailed", "Parse Failed"),
        description:
          error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [t]);

  // Handle AI column mapping
  const handleAiMapping = useCallback(async (): Promise<Record<string, string>> => {
    if (!parsedData) {
      throw new Error("No parsed data available");
    }

    const formData = new FormData();
    formData.set("intent", "map-columns");
    formData.set("headers", JSON.stringify(parsedData.headers));

    try {
      const response = await fetch("/action.import-csv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to map columns");
      }

      const data = await response.json() as {
        error?: string;
        mapping?: ColumnMapping;
      };

      if (data.error) {
        toast({
          title: t("import.csv.errors.mappingFailed", "Mapping Failed"),
          description: data.error,
          variant: "destructive",
        });
        throw new Error(data.error);
      }

      const resultMapping = data.mapping || {};
      setMapping(resultMapping);
      return resultMapping as Record<string, string>;
    } catch (error) {
      toast({
        title: t("import.csv.errors.mappingFailed", "Mapping Failed"),
        description:
          error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      throw error;
    }
  }, [parsedData, t]);

  // Handle mapping change
  const handleMappingChange = (field: string, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  // Handle import validation
  const handleValidateImport = async () => {
    if (!parsedData || !file) return;

    const formData = new FormData();
    formData.set("intent", "import");
    formData.set("rows", JSON.stringify(parsedData.rows));
    formData.set("mapping", JSON.stringify(mapping));
    formData.set("options", JSON.stringify({ ...options, dryRun: true }));

    try {
      const response = await fetch("/action.import-csv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Validation failed");
      }

      const result = await response.json() as {
        error?: string;
        imported?: number;
        [key: string]: unknown;
      };

      if (result.error) {
        toast({
          title: t("import.csv.errors.validationFailed", "Validation Failed"),
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setImportResult(result);
      setStep("review");
    } catch (error) {
      toast({
        title: t("import.csv.errors.validationFailed", "Validation Failed"),
        description:
          error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Handle final import
  const handleImport = async () => {
    if (!parsedData || !file) return;

    const formData = new FormData();
    formData.set("intent", "import");
    formData.set("rows", JSON.stringify(parsedData.rows));
    formData.set("mapping", JSON.stringify(mapping));
    formData.set("options", JSON.stringify({ ...options, dryRun: false }));

    try {
      const response = await fetch("/action.import-csv", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Import failed");
      }

      const result = await response.json() as {
        error?: string;
        imported?: number;
        [key: string]: unknown;
      };

      if (result.error) {
        toast({
          title: t("import.csv.errors.importFailed", "Import Failed"),
          description: result.error,
          variant: "destructive",
        });
        return;
      }

      setImportResult(result);

      toast({
        title: t("import.csv.success.title", "Import Successful"),
        description: t(
          "import.csv.success.description",
          "Imported {{count}} transactions successfully",
          { count: result.imported || 0 }
        ),
      });

      // Reset and go back to upload
      setFile(null);
      setParsedData(null);
      setMapping({});
      setImportResult(null);
      setStep("upload");
    } catch (error) {
      toast({
        title: t("import.csv.errors.importFailed", "Import Failed"),
        description:
          error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const mappedColumns = Object.values(mapping).filter(Boolean) as string[];

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {t("import.csv.title", "Import Transactions")}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {t(
                    "import.csv.subtitle",
                    "Import transactions from a CSV file with AI-powered column mapping"
                  )}
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" asChild>
            <a href="/transactions">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("import.csv.backToTransactions", "Back to Transactions")}
            </a>
          </Button>
        </div>
      </div>

      {/* Progress Steps */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StepIndicator
              number={1}
              label={t("import.csv.steps.upload", "Upload")}
              active={step === "upload"}
              completed={step !== "upload"}
            />
            <Separator orientation="horizontal" className="w-16" />
            <StepIndicator
              number={2}
              label={t("import.csv.steps.mapping", "Map Columns")}
              active={step === "mapping"}
              completed={step !== "upload" && step !== "mapping"}
            />
            <Separator orientation="horizontal" className="w-16" />
            <StepIndicator
              number={3}
              label={t("import.csv.steps.options", "Options")}
              active={step === "options"}
              completed={step === "review"}
            />
            <Separator orientation="horizontal" className="w-16" />
            <StepIndicator
              number={4}
              label={t("import.csv.steps.review", "Review")}
              active={step === "review"}
              completed={false}
            />
          </div>
        </div>
      </Card>

      {/* Main Content */}
      <Tabs value={step} onValueChange={(v) => setStep(v as "upload" | "mapping" | "options" | "review")}>
        <TabsContent value="upload">
          <div className="space-y-6">
            <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded" />}>
              <CsvDropzone
                file={file}
                onFileSelect={handleFileSelect}
                onFileRemove={() => {
                  setFile(null);
                  setParsedData(null);
                  setMapping({});
                }}
              />
            </Suspense>

            {/* Instructions */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">
                {t("import.csv.instructions.title", "CSV File Requirements")}
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  {t(
                    "import.csv.instructions.format",
                    "File must be in CSV format with headers in the first row"
                  )}
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  {t(
                    "import.csv.instructions.columns",
                    "Include columns for: date, amount, and description"
                  )}
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  {t(
                    "import.csv.instructions.optional",
                    "Optional columns: merchant, category, account"
                  )}
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600" />
                  {t(
                    "import.csv.instructions.size",
                    "Maximum file size: 10MB"
                  )}
                </li>
              </ul>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mapping">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <Suspense fallback={<div className="h-16 animate-pulse bg-muted rounded" />}>
                <AiMappingButton
                  onMapColumns={handleAiMapping}
                  disabled={isLoading}
                />
              </Suspense>

              <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded" />}>
                <ColumnMappingTable
                  headers={parsedData?.headers || []}
                  mapping={mapping as Record<string, string>}
                  onMappingChange={handleMappingChange}
                  disabled={isLoading}
                />
              </Suspense>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("upload")}
                  className="flex-1"
                >
                  {t("import.csv.actions.back", "Back")}
                </Button>
                <Button
                  onClick={() => setStep("options")}
                  className="flex-1"
                  disabled={!mapping.date || !mapping.amount || !mapping.description}
                >
                  {t("import.csv.actions.next", "Next")}
                </Button>
              </div>
            </div>

            <div>
              <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded" />}>
                <CsvPreview
                  headers={parsedData?.headers || []}
                  rows={parsedData?.rows || []}
                  mappedColumns={mappedColumns}
                />
              </Suspense>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="options">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded" />}>
                <ImportOptions
                  accounts={loaderData.accounts}
                  categories={loaderData.categories}
                  targetAccountId={options.targetAccountId}
                  defaultCategoryId={options.defaultCategoryId}
                  dateFormat={options.dateFormat}
                  skipHeaderRow={options.skipHeaderRow}
                  dryRun={options.dryRun}
                  onTargetAccountChange={(value) =>
                    setOptions((prev) => ({ ...prev, targetAccountId: value }))
                  }
                  onDefaultCategoryChange={(value) =>
                    setOptions((prev) => ({ ...prev, defaultCategoryId: value }))
                  }
                  onDateFormatChange={(value) =>
                    setOptions((prev) => ({ ...prev, dateFormat: value }))
                  }
                  onSkipHeaderRowChange={(checked) =>
                    setOptions((prev) => ({ ...prev, skipHeaderRow: checked }))
                  }
                  onDryRunChange={(checked) =>
                    setOptions((prev) => ({ ...prev, dryRun: checked }))
                  }
                  disabled={isLoading}
                />
              </Suspense>
            </div>

            <div className="space-y-6">
              <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded" />}>
                <CsvPreview
                  headers={parsedData?.headers || []}
                  rows={parsedData?.rows || []}
                  mappedColumns={mappedColumns}
                />
              </Suspense>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("mapping")}
                  className="flex-1"
                >
                  {t("import.csv.actions.back", "Back")}
                </Button>
                <Button
                  onClick={handleValidateImport}
                  className="flex-1"
                  disabled={!options.targetAccountId || isLoading}
                >
                  {t("import.csv.actions.review", "Review")}
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="review">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded" />}>
                <ImportSummary
                  result={importResult}
                  rowCount={parsedData?.rows.length || 0}
                  isImporting={isLoading}
                  onConfirm={handleImport}
                  onBack={() => setStep("options")}
                />
              </Suspense>
            </div>

            <div>
              <Suspense fallback={<div className="h-64 animate-pulse bg-muted rounded" />}>
                <CsvPreview
                  headers={parsedData?.headers || []}
                  rows={parsedData?.rows || []}
                  mappedColumns={mappedColumns}
                />
              </Suspense>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component for step indicator
function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
          ${active ? "bg-primary text-primary-foreground" : ""}
          ${completed ? "bg-green-600 text-white" : ""}
          ${!active && !completed ? "bg-muted text-muted-foreground" : ""}
        `}
      >
        {completed ? <CheckCircle2 className="h-4 w-4" /> : number}
      </div>
      <span className={active ? "font-semibold" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}
