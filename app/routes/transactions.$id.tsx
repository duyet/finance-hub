import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect, useLoaderData, useNavigation, Link, Form } from "react-router";
import { ArrowLeft, Edit, Trash2, FileText, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { getDb } from "../lib/auth/db.server";
import { requireAuth } from "../lib/auth/session.server";
import { transactionsCrud, type TransactionWithRelations, type TransactionStatus } from "../lib/db/transactions.server";
import { transactionIdSchema } from "../lib/validations/transaction";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { StatusBadge } from "~/components/transactions/TransactionActions";
import { CategoryBadge } from "~/components/transactions/CategoryBadge";
import { formatCurrency } from "../lib/i18n/currency";

/**
 * Loader - fetch single transaction
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Validate and parse transaction ID
  const { id } = transactionIdSchema.parse(params);

  const transaction = await transactionsCrud.getTransactionById(db, id, user.id);

  if (!transaction) {
    throw new Response("Transaction not found", { status: 404 });
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    transaction,
  };
}

/**
 * Action - handle update and delete
 */
export async function action({ request, params }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  // Validate and parse transaction ID
  const { id } = transactionIdSchema.parse(params);

  try {
    switch (intent) {
      case "delete": {
        await transactionsCrud.deleteTransaction(db, id, user.id);
        return redirect("/transactions");
      }

      case "update": {
        const data = {
          accountId: formData.get("accountId") as string,
          categoryId: (formData.get("categoryId") as string) || null,
          date: formData.get("date") as string,
          amount: parseFloat(formData.get("amount") as string),
          description: formData.get("description") as string,
          merchantName: (formData.get("merchantName") as string) || null,
          status: formData.get("status") as TransactionStatus,
          referenceNumber: (formData.get("referenceNumber") as string) || null,
          receiptUrl: (formData.get("receiptUrl") as string) || null,
          notes: (formData.get("notes") as string) || null,
        };

        await transactionsCrud.updateTransaction(db, id, user.id, data);
        return { success: true, message: "Transaction updated successfully" };
      }

      default:
        return { success: false, message: "Invalid action" };
    }
  } catch (error) {
    console.error("Transaction action error:", error);
    return { success: false, message: "An error occurred while processing your request" };
  }
}

/**
 * Transaction detail section component
 */
interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
}

function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </h3>
      {children}
    </div>
  );
}

/**
 * Detail row component
 */
interface DetailRowProps {
  label: string;
  value: React.ReactNode;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

/**
 * Transaction detail page component
 */
export default function TransactionDetailPage() {
  const data = useLoaderData<typeof loader>() ?? {
    user: { id: "", email: "", name: "" },
    transaction: null,
  };
  const navigation = useNavigation();
  const isPending = navigation.state === "submitting";

  const transaction = data.transaction;
  if (!transaction) {
    return <div>Loading...</div>;
  }
  const isIncome = transaction.amount >= 0;
  const amountClass = isIncome ? "text-green-600" : "text-red-600";
  const amountPrefix = isIncome ? "+" : "";

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      const formData = new FormData();
      formData.set("intent", "delete");
      // Submit the form
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-indigo-600">Finance Hub</h1>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">Transaction Details</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-700">{data.user.name || data.user.email}</span>
              <Button variant="outline" asChild>
                <a href="/dashboard">Dashboard</a>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link to="/transactions">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Transactions
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {transaction.description}
              </h2>
              {transaction.merchant_name && (
                <p className="text-gray-600 mt-1">{transaction.merchant_name}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link to={`/transactions/${transaction.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Form method="post" onSubmit={(e) => {
                e.preventDefault();
                handleDelete();
              }}>
                <input type="hidden" name="intent" value="delete" />
                <Button type="submit" variant="destructive" disabled={isPending}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </Form>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Details Card */}
          <div className="md:col-span-2 space-y-6">
            {/* Amount and Status */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className={`text-3xl font-bold ${amountClass}`}>
                      {amountPrefix}
                      {formatCurrency(transaction.amount, { currency: "VND" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={transaction.status} />
                    <p className="text-sm text-muted-foreground mt-2">
                      {format(new Date(transaction.date), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Details */}
            <Card>
              <CardHeader>
                <CardTitle>Transaction Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailSection title="Basic Information">
                  <DetailRow
                    label="Description"
                    value={transaction.description}
                  />
                  {transaction.merchant_name && (
                    <DetailRow
                      label="Merchant"
                      value={transaction.merchant_name}
                    />
                  )}
                  <DetailRow
                    label="Date"
                    value={format(new Date(transaction.date), "MMMM d, yyyy")}
                  />
                  <DetailRow
                    label="Status"
                    value={<StatusBadge status={transaction.status} />}
                  />
                </DetailSection>

                <Separator />

                <DetailSection title="Categorization">
                  <DetailRow
                    label="Account"
                    value={
                      <div className="flex items-center gap-2">
                        <span>{transaction.account_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {transaction.account_type}
                        </Badge>
                      </div>
                    }
                  />
                  {transaction.category_name && (
                    <DetailRow
                      label="Category"
                      value={
                        <CategoryBadge
                          name={transaction.category_name}
                          type={transaction.category_type as "INCOME" | "EXPENSE"}
                          color={transaction.category_color}
                          icon={transaction.category_icon}
                        />
                      }
                    />
                  )}
                </DetailSection>

                {transaction.reference_number && (
                  <>
                    <Separator />
                    <DetailSection title="Reference">
                      <DetailRow
                        label="Reference Number"
                        value={transaction.reference_number}
                      />
                    </DetailSection>
                  </>
                )}

                {transaction.notes && (
                  <>
                    <Separator />
                    <DetailSection title="Notes">
                      <p className="text-sm bg-muted p-3 rounded-md">
                        {transaction.notes}
                      </p>
                    </DetailSection>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to={`/transactions/${transaction.id}/edit`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Transaction
                  </Link>
                </Button>
                {transaction.receipt_url && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a
                      href={transaction.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      View Receipt
                      <ExternalLink className="ml-auto h-3 w-3" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Transaction
                </Button>
              </CardContent>
            </Card>

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle>Metadata</CardTitle>
                <CardDescription>Technical information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(transaction.created_at), "MMM d, yyyy")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span>{format(new Date(transaction.updated_at), "MMM d, yyyy")}</span>
                </div>
                {transaction.reference_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ref #</span>
                    <span className="font-mono text-xs">{transaction.reference_number}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono text-xs">{transaction.id}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
