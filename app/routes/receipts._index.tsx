/**
 * Receipt History Page
 * View all uploaded receipts and their processing status
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { useState } from "react";
import { getUserFromSession } from "../lib/auth/session.server";
import { getUserReceipts, receiptsCrud } from "../lib/db/receipts.server";
import { getDb } from "../lib/auth/db.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Link } from "react-router";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Trash2,
  Plus,
} from "lucide-react";
import type { ReceiptRecord, ReceiptProcessingStatus } from "../lib/types/receipt";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getUserFromSession(request);

  if (!user) {
    return redirect("/auth/login?redirect=/receipts");
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const status = url.searchParams.get("status") as ReceiptProcessingStatus | null;

  const { receipts, total } = await getUserReceipts(request, user.id, page, 20);

  return {
    receipts,
    total,
    page,
    pageSize: 20,
    status,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await getUserFromSession(request);

  if (!user) {
    return { error: "Unauthorized" };
  }

  const formData = await request.formData();
  const actionType = formData.get("_action");

  if (actionType === "delete" && user) {
    const receiptId = formData.get("receiptId") as string;

    const db = getDb(request);
    await receiptsCrud.deleteReceipt(db, receiptId, user.id);

    return { success: true };
  }

  return { error: "Invalid action" };
}

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
  },
  processing: {
    label: "Processing",
    icon: Clock,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  },
  needs_review: {
    label: "Needs Review",
    icon: AlertCircle,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    color: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  },
};

export default function ReceiptsHistoryPage({
  loaderData,
}: {
  loaderData: {
    receipts: ReceiptRecord[];
    total: number;
    page: number;
    pageSize: number;
    status: ReceiptProcessingStatus | null;
  };
}) {
  const { receipts, total, page, pageSize, status } = loaderData;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (receiptId: string) => {
    if (!confirm("Are you sure you want to delete this receipt?")) {
      return;
    }

    setDeletingId(receiptId);

    const formData = new FormData();
    formData.append("_action", "delete");
    formData.append("receiptId", receiptId);

    try {
      const response = await fetch("/receipts", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        window.location.reload();
      }
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Receipts</h1>
          <p className="text-muted-foreground mt-2">
            Manage your uploaded receipts ({total} total)
          </p>
        </div>

        <Link to="/import/receipt">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Upload Receipt
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <Link to="/receipts">
          <Button
            variant={!status ? "default" : "outline"}
            size="sm"
          >
            All
          </Button>
        </Link>

        {Object.entries(statusConfig).map(([key, config]) => (
          <Link key={key} to={`/receipts?status=${key}`}>
            <Button
              variant={status === key ? "default" : "outline"}
              size="sm"
            >
              {config.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Receipts Grid */}
      {receipts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No receipts yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your first receipt to get started
            </p>
            <Link to="/import/receipt">
              <Button>Upload Receipt</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {receipts.map((receipt) => {
            const config = statusConfig[receipt.status];
            const StatusIcon = config.icon;

            return (
              <Card key={receipt.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">
                        {receipt.extractedData.merchantName || "Unknown Merchant"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(receipt.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <Badge className={config.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-muted rounded-md overflow-hidden">
                    <img
                      src={receipt.thumbnailUrl || receipt.imageUrl}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Extracted Data */}
                  {receipt.extractedData.totalAmount && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Amount</span>
                      <span className="font-medium">
                        {receipt.extractedData.currency || "$"}
                        {receipt.extractedData.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  )}

                  {receipt.extractedData.date && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Date</span>
                      <span className="text-sm">
                        {new Date(receipt.extractedData.date).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {/* Confidence */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Confidence</span>
                    <span className="text-sm">
                      {(receipt.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {receipt.transactionId ? (
                      <Link
                        to={`/transactions/${receipt.transactionId}`}
                        className="flex-1"
                      >
                        <Button variant="outline" size="sm" className="w-full gap-1">
                          <Eye className="w-3 h-3" />
                          View Transaction
                        </Button>
                      </Link>
                    ) : (
                      <Link to={`/import/receipt?receipt=${receipt.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full gap-1">
                          <FileText className="w-3 h-3" />
                          Review
                        </Button>
                      </Link>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(receipt.id)}
                      disabled={deletingId === receipt.id}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {page > 1 && (
            <Link to={`/receipts?page=${page - 1}${status ? `&status=${status}` : ""}`}>
              <Button variant="outline" size="sm">
                Previous
              </Button>
            </Link>
          )}

          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>

          {page < totalPages && (
            <Link to={`/receipts?page=${page + 1}${status ? `&status=${status}` : ""}`}>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
