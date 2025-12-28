/**
 * Receipt OCR Import Page
 * Upload receipt, process with AI, review extracted data, create transaction
 */

import type { LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { useState } from "react";
import { useLoaderData } from "react-router";
import type { D1Database } from "@cloudflare/workers-types";
import { getUserFromSession } from "../lib/auth/session.server";
import { ReceiptUpload } from "~/components/receipts/ReceiptUpload";
import { OcrProcessing } from "~/components/receipts/OcrProcessing";
import { ReceiptDataForm } from "~/components/receipts/ReceiptDataForm";
import { Button } from "~/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { getUserReceipts } from "../lib/db/receipts.server";
import { transactionsCrud } from "../lib/db/transactions.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request);

  if (!user) {
    return redirect("/auth/login?redirect=/import/receipt");
  }

  // Get DB from Cloudflare context
  // @ts-ignore - Cloudflare context is attached to request
  const db = request.context?.cloudflare?.env?.DB as D1Database | undefined;

  if (!db) {
    throw new Response("Database not available", { status: 500 });
  }

  // Get accounts and categories for form
  const [filterOptions, recentReceipts] = await Promise.all([
    transactionsCrud.getTransactionFilters(db, user.id),
    getUserReceipts(request, user.id, 1, 5),
  ]);

  return ({
    user,
    accounts: filterOptions.accounts,
    categories: filterOptions.categories,
    recentReceipts: recentReceipts.receipts,
  });
}

interface LoaderData {
  user: {
    id: string;
    locale?: string;
  };
  accounts: Array<{ id: string; name: string; type: string }>;
  categories: Array<{ id: string; name: string; type: string; color?: string | null }>;
  recentReceipts: unknown[];
}

export default function ReceiptImportPage() {
  const { user, accounts, categories } = useLoaderData<LoaderData>();
  const [step, setStep] = useState<"upload" | "processing" | "review">(
    "upload"
  );
  const [uploadData, setUploadData] = useState<{
    imageUrl: string;
    receiptId: string;
  } | null>(null);
  const [ocrResult, setOcrResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleUploadComplete = (imageUrl: string, receiptId: string) => {
    setUploadData({ imageUrl, receiptId });
    setStep("processing");

    // Start processing
    processReceipt(imageUrl, receiptId);
  };

  const processReceipt = async (imageUrl: string, receiptId: string) => {
    setError(null);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append("imageUrl", imageUrl);
      formData.append("receiptId", receiptId);
      formData.append("detectCurrency", "true");
      formData.append("extractLineItems", "true");
      formData.append("locale", user.locale || "en");

      const response = await fetch("/action/process-receipt", {
        method: "POST",
        body: formData,
      });

      const data = await response.json() as {
        success?: boolean;
        error?: string;
        [key: string]: unknown;
      };

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Processing failed");
      }

      setOcrResult(data);
      setStep("review");
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : "Failed to process receipt");
      setStep("upload");
    }
  };

  const handleTransactionCreated = () => {
    // Redirect to transactions page
    window.location.href = "/transactions";
  };

  const handleReset = () => {
    setStep("upload");
    setUploadData(null);
    setOcrResult(null);
    setError(null);
    setProgress(0);
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/transactions"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Transactions
        </Link>

        <h1 className="text-3xl font-bold">Import Receipt</h1>
        <p className="text-muted-foreground mt-2">
          Upload a receipt and let AI extract the transaction details
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {error}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={handleReset}
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Step Content */}
      {step === "upload" && (
        <ReceiptUpload
          onUploadStart={() => setError(null)}
          onUploadComplete={handleUploadComplete}
          onError={setError}
        />
      )}

      {step === "processing" && <OcrProcessing progress={progress} />}

      {step === "review" && ocrResult && uploadData && (
        <ReceiptDataForm
          imageUrl={uploadData.imageUrl}
          extractedData={ocrResult.extractedData}
          confidence={ocrResult.confidence}
          receiptId={ocrResult.receiptId}
          categorySuggestions={ocrResult.categorySuggestions}
          accounts={accounts}
          categories={categories}
        />
      )}
    </div>
  );
}
