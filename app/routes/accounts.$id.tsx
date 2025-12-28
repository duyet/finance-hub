/**
 * Account Detail Page
 *
 * Shows detailed information about a single financial account including:
 * - Account summary and balance
 * - Recent transactions
 * - Edit account form
 * - Archive option
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { useLoaderData, useActionData, useNavigate, Link, Form } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import {
  accountDb,
  type AccountWithTransactions,
  type UpdateAccountData,
  getAccountTypeConfig,
} from "~/lib/db/accounts.server";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { ArrowLeft, Edit3, Landmark, PiggyBank, Wallet, TrendingUp, CreditCard, Home } from "lucide-react";
import { useI18n } from "~/lib/i18n/client";
import { useState } from "react";

type ActionData = {
  errors?: {
    _form?: string;
    name?: string;
    account_number_last4?: string;
  };
  values?: {
    name?: string;
    currency?: string;
    institution_name?: string;
    account_number_last4?: string;
    color_theme?: string;
  };
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const accountId = params.id;

  if (!accountId) {
    throw new Response("Account ID is required", { status: 400 });
  }

  const account = await accountDb.getByIdWithTransactions(db, accountId, user.id, 10);

  if (!account) {
    throw new Response("Account not found", { status: 404 });
  }

  return {
    account,
  };
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const accountId = params.id;
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (!accountId) {
    throw new Response("Account ID is required", { status: 400 });
  }

  if (intent === "update") {
    const name = formData.get("name") as string;
    const currency = formData.get("currency") as string;
    const institutionName = formData.get("institution_name") as string;
    const accountNumberLast4 = formData.get("account_number_last4") as string;
    const colorTheme = formData.get("color_theme") as string;

    // Validation
    const errors: Record<string, string> = {};

    if (!name || name.trim().length === 0) {
      errors.name = "Account name is required";
    }

    if (accountNumberLast4 && !/^\d{4}$/.test(accountNumberLast4)) {
      errors.account_number_last4 = "Must be exactly 4 digits";
    }

    if (Object.keys(errors).length > 0) {
      return {
        errors: {
          name: errors.name as string | undefined,
          account_number_last4: errors.account_number_last4 as string | undefined,
        },
        values: {
          name,
          currency,
          institution_name: institutionName,
          account_number_last4: accountNumberLast4,
          color_theme: colorTheme
        }
      };
    }

    // Update the account
    try {
      await accountDb.update(db, accountId, user.id, {
        name: name.trim(),
        currency: currency || undefined,
        institution_name: institutionName || undefined,
        account_number_last4: accountNumberLast4 || undefined,
        color_theme: colorTheme || undefined,
      });

      return redirect(`/accounts/${accountId}`);
    } catch (error) {
      return { errors: { _form: "Failed to update account. Please try again." }, values: {} };
    }
  }

  if (intent === "archive") {
    await accountDb.archive(db, accountId, user.id);
    return redirect("/accounts");
  }

  return { success: false };
}

export default function AccountDetailPage() {
  const { account } = useLoaderData<typeof loader>();
  const { t, formatCurrency, formatDate } = useI18n();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const actionData = useActionData<ActionData>();

  const errors = actionData?.errors || {};
  const values = actionData?.values || {};

  const config = getAccountTypeConfig(account.type);

  // Account type icon mapping
  const getAccountIcon = (type: string) => {
    switch (type) {
      case "CHECKING":
        return <Landmark className="w-6 h-6" />;
      case "SAVINGS":
        return <PiggyBank className="w-6 h-6" />;
      case "WALLET":
        return <Wallet className="w-6 h-6" />;
      case "INVESTMENT":
        return <TrendingUp className="w-6 h-6" />;
      case "CREDIT_CARD":
        return <CreditCard className="w-6 h-6" />;
      case "LOAN":
        return <Home className="w-6 h-6" />;
      default:
        return <Wallet className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/accounts")}
                className="text-gray-600 hover:text-indigo-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              {getAccountIcon(account.type)}
              <h1 className="text-xl font-bold text-gray-900">{account.name}</h1>
              <Badge variant="outline" className="gap-1">
                {config.label}
              </Badge>
              {account.account_number_last4 && (
                <Badge variant="secondary">•••• {account.account_number_last4}</Badge>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Summary Card */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{t("accounts.accountSummary") || "Account Summary"}</CardTitle>
                    <p className="text-gray-600 mt-1">
                      {account.institution_name || t("accounts.noInstitution") || "No institution specified"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    {isEditing ? (t("common.cancel") || "Cancel") : (t("common.edit") || "Edit")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Edit Form */}
                {isEditing ? (
                  <Form method="post" className="space-y-4">
                    <input type="hidden" name="intent" value="update" />

                    {errors._form && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{errors._form}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">{t("accounts.accountName") || "Account Name"}</Label>
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          defaultValue={values.name || account.name}
                          className={errors.name ? "border-red-500" : ""}
                          required
                        />
                        {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
                      </div>

                      <div>
                        <Label htmlFor="currency">{t("accounts.currency") || "Currency"}</Label>
                        <select
                          id="currency"
                          name="currency"
                          defaultValue={values.currency || account.currency}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="VND">VND - Vietnamese Dong</option>
                          <option value="USD">USD - US Dollar</option>
                          <option value="EUR">EUR - Euro</option>
                          <option value="GBP">GBP - British Pound</option>
                          <option value="JPY">JPY - Japanese Yen</option>
                          <option value="SGD">SGD - Singapore Dollar</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="institution_name">{t("accounts.institutionName") || "Institution Name"}</Label>
                        <Input
                          id="institution_name"
                          name="institution_name"
                          type="text"
                          defaultValue={values.institution_name || account.institution_name || ""}
                        />
                      </div>

                      <div>
                        <Label htmlFor="account_number_last4">
                          {t("accounts.accountNumberLast4") || "Account Number (Last 4)"}
                        </Label>
                        <Input
                          id="account_number_last4"
                          name="account_number_last4"
                          type="text"
                          maxLength={4}
                          defaultValue={values.account_number_last4 || account.account_number_last4 || ""}
                          pattern="\d{4}"
                          className={errors.account_number_last4 ? "border-red-500" : ""}
                        />
                        {errors.account_number_last4 && <p className="text-sm text-red-500 mt-1">{errors.account_number_last4}</p>}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                        {t("common.cancel") || "Cancel"}
                      </Button>
                      <Button type="submit">{t("common.save") || "Save Changes"}</Button>
                    </div>
                  </Form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">{t("accounts.currentBalance") || "Current Balance"}</p>
                      <p className="text-4xl font-bold text-gray-900 mt-1">
                        {formatCurrency(account.current_balance, account.currency)}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-600">{t("accounts.accountType") || "Type"}</p>
                        <p className="font-medium text-gray-900 mt-1">{config.label}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{t("accounts.currency") || "Currency"}</p>
                        <p className="font-medium text-gray-900 mt-1">{account.currency}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{t("accounts.created") || "Created"}</p>
                        <p className="font-medium text-gray-900 mt-1">
                          {formatDate(account.created_at, "medium")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{t("accounts.recentTransactions") || "Recent Transactions"}</CardTitle>
                  <Link to={`/transactions?accountId=${account.id}`}>
                    <Button variant="outline" size="sm">
                      {t("accounts.viewAll") || "View All"}
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {account.recentTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {t("accounts.noTransactions") || "No transactions yet"}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("common.date") || "Date"}</TableHead>
                        <TableHead>{t("common.description") || "Description"}</TableHead>
                        <TableHead>{t("common.category") || "Category"}</TableHead>
                        <TableHead className="text-right">{t("common.amount") || "Amount"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {account.recentTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell className="text-gray-600">
                            {formatDate(transaction.date, "short")}
                          </TableCell>
                          <TableCell className="font-medium">{transaction.description}</TableCell>
                          <TableCell>
                            {transaction.category ? (
                              <Badge variant="secondary">{transaction.category}</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${
                            transaction.amount < 0 ? "text-red-600" : "text-green-600"
                          }`}>
                            {formatCurrency(transaction.amount, account.currency)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Account Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("accounts.actions") || "Actions"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link
                  to={`/transactions?accountId=${account.id}`}
                  className="block w-full px-4 py-3 text-left hover:bg-gray-50 rounded-md transition-colors"
                >
                  <div className="font-medium">{t("accounts.viewTransactions") || "View Transactions"}</div>
                  <div className="text-sm text-gray-600">
                    {t("accounts.viewTransactionsHint") || "See all transactions for this account"}
                  </div>
                </Link>

                <Link
                  to={`/reports/generate?accountId=${account.id}`}
                  className="block w-full px-4 py-3 text-left hover:bg-gray-50 rounded-md transition-colors"
                >
                  <div className="font-medium">{t("accounts.generateReport") || "Generate Report"}</div>
                  <div className="text-sm text-gray-600">
                    {t("accounts.generateReportHint") || "Create a financial report for this account"}
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("accounts.settings") || "Settings"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  {t("accounts.editDetails") || "Edit Account Details"}
                </Button>

                <Form method="post">
                  <input type="hidden" name="intent" value="archive" />
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={(e) => {
                      if (!confirm(t("accounts.confirmArchive") || "Are you sure you want to archive this account?")) {
                        e.preventDefault();
                      }
                    }}
                  >
                    {t("accounts.archiveAccount") || "Archive Account"}
                  </Button>
                </Form>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("accounts.quickStats") || "Quick Stats"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t("accounts.totalTransactions") || "Total Transactions"}</span>
                    <span className="font-semibold">{account.recentTransactions.length}</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">{t("accounts.accountId") || "Account ID"}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono break-all">{account.id}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
