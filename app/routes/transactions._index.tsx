import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect, useLoaderData, useNavigation, useSearchParams } from "react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { getDb } from "../lib/auth/db.server";
import { requireAuth } from "../lib/auth/session.server";
import { transactionsCrud, type TransactionFilters, type PaginationOptions, type TransactionStatus } from "../lib/db/transactions.server";
import { parseTransactionFilters, type CreateTransactionInput } from "../lib/validations/transaction";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { TransactionFilters as TransactionFiltersComponent } from "~/components/transactions/TransactionFilters";
import { TransactionsTable } from "~/components/transactions/TransactionsTable";
import { TransactionDialog } from "~/components/transactions/TransactionDialog";
import { BatchOperationsToolbar } from "~/components/transactions/batch-operations-toolbar";
import { useToast } from "~/components/ui/use-toast";

/**
 * Loader - fetch transactions and filter options
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const url = new URL(request.url);

  // Parse filters from URL search params
  const searchParams = url.searchParams;
  const parsedFilters = parseTransactionFilters(searchParams);

  // Build filters object
  const filters: TransactionFilters = {
    search: parsedFilters.search,
    type: parsedFilters.type,
    status: parsedFilters.status,
    accountIds: parsedFilters.accountIds,
    categoryIds: parsedFilters.categoryIds,
    startDate: parsedFilters.startDate,
    endDate: parsedFilters.endDate,
  };

  // Build pagination options
  const pagination: PaginationOptions = {
    page: parsedFilters.page,
    pageSize: parsedFilters.pageSize,
    sortBy: parsedFilters.sortBy,
    sortOrder: parsedFilters.sortOrder,
  };

  // Fetch transactions and filter options in parallel
  const [transactionsData, filterOptions] = await Promise.all([
    transactionsCrud.getTransactions(db, user.id, filters, pagination),
    transactionsCrud.getTransactionFilters(db, user.id),
  ]);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    transactions: transactionsData.transactions,
    total: transactionsData.total,
    page: transactionsData.page,
    pageSize: transactionsData.pageSize,
    totalPages: transactionsData.totalPages,
    pagination,
    filterOptions,
    currentFilters: filters,
  };
}

/**
 * Action - handle create, update, delete transactions
 */
export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    switch (intent) {
      case "create": {
        const data = {
          accountId: formData.get("accountId") as string,
          categoryId: (formData.get("categoryId") as string) || null,
          date: formData.get("date") as string,
          amount: parseFloat(formData.get("amount") as string),
          description: formData.get("description") as string,
          merchantName: (formData.get("merchantName") as string) || null,
          status: ((formData.get("status") as string) || "POSTED") as TransactionStatus,
          referenceNumber: (formData.get("referenceNumber") as string) || null,
          receiptUrl: (formData.get("receiptUrl") as string) || null,
          notes: (formData.get("notes") as string) || null,
        };

        await transactionsCrud.createTransaction(db, user.id, data);
        return { success: true, message: "Transaction created successfully" };
      }

      case "delete": {
        const id = formData.get("id") as string;
        await transactionsCrud.deleteTransaction(db, id, user.id);
        return { success: true, message: "Transaction deleted successfully" };
      }

      case "bulk-delete": {
        const transactionIds = formData.get("transactionIds") as string;
        const ids = transactionIds.split(",");
        const count = await transactionsCrud.bulkDeleteTransactions(db, ids, user.id);
        return { success: true, message: `${count} transaction(s) deleted` };
      }

      case "bulk-update-category": {
        const transactionIds = formData.get("transactionIds") as string;
        const categoryId = (formData.get("categoryId") as string) || null;
        const ids = transactionIds.split(",");
        const count = await transactionsCrud.bulkUpdateCategory(db, ids, categoryId, user.id);
        return { success: true, message: `${count} transaction(s) updated` };
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
 * Transactions list page component
 */
export default function TransactionsListPage() {
  const data = useLoaderData<typeof loader>() ?? {
    user: { id: "", email: "", name: "" },
    transactions: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
    pagination: { sortBy: "date", sortOrder: "desc" },
    filterOptions: { accounts: [], categories: [] },
    currentFilters: {},
  };
  const navigation = useNavigation();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Local state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isPending = navigation.state === "submitting";

  // Handle row selection
  const handleSelectAll = () => {
    if (!data.transactions || data.transactions.length === 0) {
      return;
    }
    if (selectedIds.length === data.transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.transactions.map((t) => t.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Handle sorting
  const handleSort = (sortBy: string, sortOrder: "asc" | "desc") => {
    const params = new URLSearchParams(searchParams);
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    params.set("page", "1");
    window.location.search = params.toString();
  };

  // Handle edit
  const handleEdit = (id: string) => {
    if (!data.transactions) return;
    const transaction = data.transactions.find((t) => t.id === id);
    if (transaction) {
      setEditingTransaction(transaction);
      setIsDialogOpen(true);
    }
  };

  // Handle delete
  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      const formData = new FormData();
      formData.set("intent", "delete");
      formData.set("id", id);
      // Submit using navigate/form
      toast({ title: "Deleting transaction..." });
      setTimeout(() => {
        window.location.reload();
      }, 500);
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
              <span className="text-gray-600">Transactions</span>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Transactions</h2>
            <p className="text-gray-600 mt-1">
              Manage and track your financial transactions
            </p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>
              Narrow down your transactions using the filters below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TransactionFiltersComponent
              filterOptions={data.filterOptions}
              currentFilters={{
                ...data.currentFilters,
                page: data.page,
                pageSize: data.pageSize,
                sortBy: data.pagination.sortBy,
                sortOrder: data.pagination.sortOrder,
              }}
            />
          </CardContent>
        </Card>

        {/* Batch Operations Toolbar */}
        <div className="mb-6">
          <BatchOperationsToolbar
            selectedIds={selectedIds}
            totalCount={data.total}
            onClear={() => setSelectedIds([])}
            disabled={isPending}
            availableCategories={data.filterOptions.categories.map((c) => ({
              id: c.id,
              name: c.name,
            }))}
          />
        </div>

        {/* Transactions Table */}
        <Card>
          <CardContent className="pt-6">
            <TransactionsTable
              transactions={data.transactions}
              total={data.total}
              page={data.page}
              pageSize={data.pageSize}
              pagination={data.pagination}
              selectedIds={selectedIds}
              onSelectAll={handleSelectAll}
              onSelectOne={handleSelectOne}
              onSort={handleSort}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((pageNum) => (
              <Button
                key={pageNum}
                variant={pageNum === data.page ? "default" : "outline"}
                size="sm"
                asChild
              >
                <a
                  href={`?${new URLSearchParams({
                    ...Object.fromEntries(searchParams),
                    page: pageNum.toString(),
                  }).toString()}`}
                >
                  {pageNum}
                </a>
              </Button>
            ))}
          </div>
        )}
      </main>

      {/* Transaction Dialog */}
      <TransactionDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingTransaction(null);
        }}
        transaction={editingTransaction}
        filterOptions={data.filterOptions}
        isSubmitting={isPending}
        onSubmit={(data) => {
          setIsDialogOpen(false);
        }}
      />
    </div>
  );
}
