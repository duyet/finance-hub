/**
 * Accounts List Page
 *
 * Displays all financial accounts including checking, savings, wallets, and investments.
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { useLoaderData, useNavigate, Form, Link } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import { accountDb } from "~/lib/db/accounts.server";
import type { AccountType } from "~/lib/db/accounts.types";
import { getAccountTypeConfig } from "~/lib/db/accounts.types";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { ArrowLeft, Plus, Wallet, Landmark, PiggyBank, TrendingUp, CreditCard, Home } from "lucide-react";
import { useI18n } from "~/lib/i18n/client";
import { useState } from "react";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { useToast } from "~/components/ui/use-toast";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  const accounts = await accountDb.getAll(db, user.id);
  const balanceSummary = await accountDb.getBalanceSummary(db, user.id);
  const netWorth = await accountDb.getNetWorth(db, user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    accounts,
    balanceSummary,
    netWorth,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "archive") {
    const accountId = formData.get("accountId") as string;
    await accountDb.archive(db, accountId, user.id);
    return redirect("/accounts");
  }

  return { success: false };
}

export default function AccountsIndexPage() {
  const { accounts, balanceSummary, netWorth } = useLoaderData<typeof loader>();
  const { t, formatCurrency } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [accountIdToArchive, setAccountIdToArchive] = useState<string | null>(null);
  const [archiveFormRef, setArchiveFormRef] = useState<HTMLFormElement | null>(null);

  // Account type icon mapping
  const getAccountIcon = (type: string) => {
    switch (type) {
      case "CHECKING":
        return <Landmark className="w-5 h-5" />;
      case "SAVINGS":
        return <PiggyBank className="w-5 h-5" />;
      case "WALLET":
        return <Wallet className="w-5 h-5" />;
      case "INVESTMENT":
        return <TrendingUp className="w-5 h-5" />;
      case "CREDIT_CARD":
        return <CreditCard className="w-5 h-5" />;
      case "LOAN":
        return <Home className="w-5 h-5" />;
      default:
        return <Wallet className="w-5 h-5" />;
    }
  };

  // Filter accounts by type
  const filteredAccounts =
    filterType === "ALL" ? accounts : accounts.filter((a) => a.type === filterType);

  // Get unique account types from accounts
  const accountTypes = ["ALL", ...Array.from(new Set(accounts.map((a) => a.type)))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-600 hover:text-indigo-600"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-indigo-600">Finance Hub</h1>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">{t("nav.accounts") || "Accounts"}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {t("accounts.title") || "Financial Accounts"}
            </h2>
            <p className="mt-2 text-gray-600">
              {t("accounts.description") || "Manage your bank accounts, savings, and investments"}
            </p>
          </div>
          <Link to="/accounts/new">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              {t("accounts.addAccount") || "New Account"}
            </Button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                {t("accounts.totalBalance") || "Total Balance"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(netWorth, "VND")}
              </div>
            </CardContent>
          </Card>

          {balanceSummary.map((summary) => {
            const config = getAccountTypeConfig(summary.type);
            return (
              <Card key={summary.type}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    {getAccountIcon(summary.type)}
                    {config.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(summary.total_balance, "VND")}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.account_count} {summary.account_count === 1 ? "account" : "accounts"}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {accountTypes.map((type) => {
            const config = type === "ALL" ? { label: "All Accounts", color: "" } : getAccountTypeConfig(type as AccountType);
            return (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  filterType === type
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* Accounts Table */}
        <Card>
          <CardContent className="p-0">
            {filteredAccounts.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("accounts.noAccounts") || "No accounts found"}
                </h3>
                <p className="text-gray-600 mb-4">
                  {t("accounts.noAccountsHint") ||
                    "Create your first account to start tracking your finances"}
                </p>
                <Link to="/accounts/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    {t("accounts.addAccount") || "New Account"}
                  </Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("accounts.accountName") || "Account Name"}</TableHead>
                    <TableHead>{t("accounts.type") || "Type"}</TableHead>
                    <TableHead>{t("accounts.institution") || "Institution"}</TableHead>
                    <TableHead className="text-right">{t("accounts.balance") || "Balance"}</TableHead>
                    <TableHead className="text-right">{t("common.actions") || "Actions"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((account) => {
                    const config = getAccountTypeConfig(account.type);
                    return (
                      <TableRow key={account.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color} bg-opacity-20`}
                            >
                              {getAccountIcon(account.type)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{account.name}</div>
                              {account.account_number_last4 && (
                                <div className="text-sm text-gray-500">
                                  •••• {account.account_number_last4}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {getAccountIcon(account.type)}
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {account.institution_name || "-"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(account.current_balance, account.currency)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link to={`/accounts/${account.id}`}>
                              <Button variant="ghost" size="sm">
                                {t("common.view") || "View"}
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setAccountIdToArchive(account.id);
                                setIsArchiveDialogOpen(true);
                              }}
                            >
                              {t("common.archive") || "Archive"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="mt-8">
          <Link to="/transactions" className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {t("nav.transactions") || "Transactions"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t("accounts.viewTransactions") || "View transaction history"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Hidden form for archive submission */}
        {accountIdToArchive && (
          <Form
            ref={setArchiveFormRef}
            method="post"
            action="/accounts"
            className="hidden"
          >
            <input type="hidden" name="intent" value="archive" />
            <input type="hidden" name="accountId" value={accountIdToArchive} />
          </Form>
        )}

        {/* Archive Confirmation Dialog */}
        <ConfirmDialog
          open={isArchiveDialogOpen}
          onOpenChange={setIsArchiveDialogOpen}
          title={t("accounts.confirmArchive") || "Archive Account?"}
          description="Are you sure you want to archive this account? This action cannot be undone."
          confirmLabel="Archive"
          variant="warning"
          onConfirm={() => {
            if (archiveFormRef) {
              toast({ title: "Archiving account..." });
              archiveFormRef.requestSubmit?.();
            }
          }}
        />
      </main>
    </div>
  );
}
