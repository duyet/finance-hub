/**
 * New Account Page
 *
 * Form to create a new financial account
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { useLoaderData, useActionData, useNavigate, Form, Link } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import { accountDb } from "~/lib/db/accounts.server";
import { ACCOUNT_TYPES } from "~/lib/db/accounts.types";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ArrowLeft, Landmark, PiggyBank, Wallet, TrendingUp } from "lucide-react";
import { useI18n } from "~/lib/i18n/client";
import { useToast } from "~/components/ui/use-toast";
import { useNavigation } from "react-router";

type ActionData = {
  errors?: {
    _form?: string;
    name?: string;
    type?: string;
    institution_name?: string;
    account_number_last4?: string;
  };
  values?: {
    name?: string;
    type?: string;
    currency?: string;
    institution_name?: string;
    account_number_last4?: string;
    color_theme?: string;
  };
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    accountTypes: ACCOUNT_TYPES,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();

  // Extract form data
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const currency = formData.get("currency") as string;
  const institutionName = formData.get("institution_name") as string;
  const accountNumberLast4 = formData.get("account_number_last4") as string;
  const colorTheme = formData.get("color_theme") as string;

  // Validation
  const errors: Record<string, string> = {};

  if (!name || name.trim().length === 0) {
    errors.name = "Account name is required";
  }

  if (!type) {
    errors.type = "Account type is required";
  }

  // Validate last 4 digits if provided
  if (accountNumberLast4 && !/^\d{4}$/.test(accountNumberLast4)) {
    errors.account_number_last4 = "Must be exactly 4 digits";
  }

  if (Object.keys(errors).length > 0) {
    return {
      errors: {
        name: errors.name as string | undefined,
        type: errors.type as string | undefined,
        account_number_last4: errors.account_number_last4 as string | undefined,
      },
      values: {
        name,
        type,
        currency,
        institution_name: institutionName,
        account_number_last4: accountNumberLast4,
        color_theme: colorTheme
      }
    };
  }

  // Create the account
  try {
    await accountDb.create(db, user.id, {
      name: name.trim(),
      type: type as any,
      currency: currency || "VND",
      institution_name: institutionName || undefined,
      account_number_last4: accountNumberLast4 || undefined,
      color_theme: colorTheme || undefined,
    });

    return redirect("/accounts");
  } catch {
    return { errors: { _form: "Failed to create account. Please try again." }, values: {} };
  }
}

export default function NewAccountPage() {
  const { accountTypes } = useLoaderData<typeof loader>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { toast } = useToast();
  const actionData = useActionData<ActionData>();

  const errors = actionData?.errors || {};
  const values = actionData?.values || {};

  // Filter out credit card and loan types (they have their own creation flows)
  const availableTypes = accountTypes.filter(
    (t) => t.value !== "CREDIT_CARD" && t.value !== "LOAN"
  );

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
      default:
        return <Wallet className="w-5 h-5" />;
    }
  };

  const colorOptions = [
    { value: "blue", label: "Blue", bg: "bg-blue-500" },
    { value: "green", label: "Green", bg: "bg-green-500" },
    { value: "purple", label: "Purple", bg: "bg-purple-500" },
    { value: "yellow", label: "Yellow", bg: "bg-yellow-500" },
    { value: "red", label: "Red", bg: "bg-red-500" },
    { value: "indigo", label: "Indigo", bg: "bg-indigo-500" },
  ];

  const isSubmitting = navigation.state === "submitting";

  const handleSubmit = () => {
    toast({ title: "Creating account..." });
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
                aria-label="Back to accounts"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-2xl font-bold text-indigo-600">Finance Hub</h1>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">{t("accounts.newAccount") || "New Account"}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            {t("accounts.createAccount") || "Create New Account"}
          </h2>
          <p className="mt-2 text-gray-600">
            {t("accounts.createAccountHint") || "Add a new bank account, savings, wallet, or investment account"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("accounts.accountDetails") || "Account Details"}</CardTitle>
          </CardHeader>
          <CardContent>
            {errors._form && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{errors._form}</p>
              </div>
            )}

            <Form method="post" className="space-y-6" onSubmit={handleSubmit}>
              {/* Account Name */}
              <div>
                <Label htmlFor="name">
                  {t("accounts.accountName") || "Account Name"} <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={values.name}
                  placeholder={t("accounts.accountNamePlaceholder") || "e.g., My Checking Account"}
                  className={errors.name ? "border-red-500" : ""}
                  required
                />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
              </div>

              {/* Account Type */}
              <div>
                <Label htmlFor="type">
                  {t("accounts.accountType") || "Account Type"} <span className="text-red-600">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  {availableTypes.map((type) => (
                    <label
                      key={type.value}
                      className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        values.type === type.value || (!values.type && type.value === "CHECKING")
                          ? "border-indigo-600 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={type.value}
                        defaultChecked={values.type === type.value || (!values.type && type.value === "CHECKING")}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${type.color} bg-opacity-20`}>
                          {getAccountIcon(type.value)}
                        </div>
                        <span className="font-medium">{type.label}</span>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.type && <p className="text-sm text-red-600 mt-1">{errors.type}</p>}
              </div>

              {/* Currency */}
              <div>
                <Label htmlFor="currency">{t("accounts.currency") || "Currency"}</Label>
                <select
                  id="currency"
                  name="currency"
                  defaultValue={values.currency || "VND"}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="VND">VND - Vietnamese Dong</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                  <option value="JPY">JPY - Japanese Yen</option>
                  <option value="SGD">SGD - Singapore Dollar</option>
                </select>
              </div>

              {/* Institution Name */}
              <div>
                <Label htmlFor="institution_name">
                  {t("accounts.institutionName") || "Institution Name"}
                </Label>
                <Input
                  id="institution_name"
                  name="institution_name"
                  type="text"
                  defaultValue={values.institution_name}
                  placeholder={t("accounts.institutionPlaceholder") || "e.g., Vietcombank, TPBank"}
                  className={errors.institution_name ? "border-red-500" : ""}
                />
                {errors.institution_name && <p className="text-sm text-red-600 mt-1">{errors.institution_name}</p>}
              </div>

              {/* Account Number (Last 4 digits) */}
              <div>
                <Label htmlFor="account_number_last4">
                  {t("accounts.accountNumberLast4") || "Account Number (Last 4 digits)"}
                </Label>
                <Input
                  id="account_number_last4"
                  name="account_number_last4"
                  type="text"
                  maxLength={4}
                  defaultValue={values.account_number_last4}
                  placeholder="1234"
                  pattern="\d{4}"
                  className={errors.account_number_last4 ? "border-red-500" : ""}
                />
                {errors.account_number_last4 && <p className="text-sm text-red-600 mt-1">{errors.account_number_last4}</p>}
                <p className="text-sm text-gray-500 mt-1">
                  {t("accounts.accountNumberHint") || "Only the last 4 digits for identification"}
                </p>
              </div>

              {/* Color Theme */}
              <div>
                <Label htmlFor="color_theme">{t("accounts.colorTheme") || "Color Theme"}</Label>
                <div className="grid grid-cols-6 gap-3 mt-2">
                  {colorOptions.map((color) => (
                    <label
                      key={color.value}
                      className={`relative flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        values.color_theme === color.value || (!values.color_theme && color.value === "blue")
                          ? "border-indigo-600"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="color_theme"
                        value={color.value}
                        defaultChecked={values.color_theme === color.value || (!values.color_theme && color.value === "blue")}
                        className="sr-only"
                      />
                      <div className={`w-8 h-8 rounded-full ${color.bg}`}></div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Link to="/accounts">
                  <Button type="button" variant="outline" disabled={isSubmitting}>
                    {t("common.cancel") || "Cancel"}
                  </Button>
                </Link>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? (t("common.creating") || "Creating...")
                    : (t("accounts.createAccount") || "Create Account")
                  }
                </Button>
              </div>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
