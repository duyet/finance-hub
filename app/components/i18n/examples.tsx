/**
 * Example components demonstrating i18n usage in Finance Hub
 *
 * These examples show how to use the i18n system in various scenarios:
 * - Translating UI text
 * - Formatting currency
 * - Formatting dates
 * - Using pluralization and interpolation
 */

import { useI18n } from "~/lib/i18n/client";

/**
 * Example 1: Basic Translation
 *
 * Simple translation using the useI18n hook
 */
export function ExampleBasicTranslation() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("app.name")}</h1>
      <p className="text-gray-600">{t("app.tagline")}</p>

      <nav className="flex gap-4">
        <a href="/dashboard">{t("nav.dashboard")}</a>
        <a href="/transactions">{t("nav.transactions")}</a>
        <a href="/accounts">{t("nav.accounts")}</a>
        <a href="/credit-cards">{t("nav.creditCards")}</a>
        <a href="/loans">{t("nav.loans")}</a>
        <a href="/settings">{t("nav.settings")}</a>
      </nav>
    </div>
  );
}

/**
 * Example 2: Currency Formatting
 *
 * Format currency according to locale conventions
 */
export function ExampleCurrencyFormatting() {
  const { formatCurrency, locale } = useI18n();

  const amounts = [
    { amount: 1234560, currency: "VND", label: "Balance" },
    { amount: 15000000, currency: "VND", label: "Income" },
    { amount: -5000000, currency: "VND", label: "Expense" },
    { amount: 1234.56, currency: "USD", label: "USD Balance" },
    { amount: -500.25, currency: "USD", label: "USD Expense" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Currency Examples (Locale: {locale})</h2>

      <div className="rounded-lg border p-4">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="py-2 text-left font-medium text-gray-700">
                Description
              </th>
              <th className="py-2 text-right font-medium text-gray-700">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {amounts.map((item) => (
              <tr key={item.label} className="border-b last:border-0">
                <td className="py-2 text-gray-600">{item.label}</td>
                <td className="py-2 text-right font-mono font-medium">
                  {formatCurrency(item.amount, item.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
        <p className="font-medium">Vietnamese VND format:</p>
        <p className="mt-1">
          1.234.560 ₫ (dot separator, no decimals, parentheses for negative)
        </p>
        <p className="mt-2 font-medium">English USD format:</p>
        <p className="mt-1">
          $1,234.56 (comma separator, 2 decimals, minus for negative)
        </p>
      </div>
    </div>
  );
}

/**
 * Example 3: Date Formatting
 *
 * Format dates according to locale conventions
 */
export function ExampleDateFormatting() {
  const { formatDate, locale } = useI18n();

  const dates = [
    { date: new Date(), label: "Today" },
    { date: new Date("2025-12-25"), label: "Custom date" },
    { date: "2025-01-15", label: "String date" },
    { date: 1705334400000, label: "Timestamp" },
  ];

  const formats = ["short", "medium", "long"] as const;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">
        Date Formatting Examples (Locale: {locale})
      </h2>

      <div className="space-y-4">
        {dates.map((item) => (
          <div key={item.label} className="rounded-lg border p-4">
            <h3 className="font-medium text-gray-700">{item.label}</h3>
            <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
              {formats.map((format) => (
                <div key={format}>
                  <span className="font-medium text-gray-500">
                    {format}:
                  </span>{" "}
                  <span className="font-mono">
                    {formatDate(item.date, format)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-green-50 p-4 text-sm text-green-900">
        <p className="font-medium">Vietnamese date format:</p>
        <p className="mt-1">DD/MM/YYYY (28/12/2025)</p>
        <p className="mt-2 font-medium">English date format:</p>
        <p className="mt-1">MM/DD/YYYY (12/28/2025)</p>
      </div>
    </div>
  );
}

/**
 * Example 4: Translation with Parameters
 *
 * Use interpolation in translations
 */
export function ExampleTranslationWithParams() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Translation with Parameters</h2>

      <div className="space-y-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-600">
            Minimum length validation (5 characters):
          </p>
          <p className="mt-1 font-medium">
            {t("validation.minLength", { min: 5 })}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-600">
            Maximum value validation (100):
          </p>
          <p className="mt-1 font-medium">
            {t("validation.maxValue", { max: 100 })}
          </p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-gray-600">
            Relative time (5 days ago):
          </p>
          <p className="mt-1 font-medium">
            {t("time.ago", { value: 5, unit: t("time.days") })}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Example 5: Financial Data Display
 *
 * Complete example showing financial data with proper formatting
 */
export function ExampleFinancialData() {
  const { t, formatCurrency, formatDate, formatPercentage, locale } =
    useI18n();

  const data = {
    totalIncome: 25000000,
    totalExpense: 15000000,
    netIncome: 10000000,
    savingsRate: 40,
    runway: 6,
    burnRate: 4500000,
    transactions: [
      {
        id: 1,
        description: "Grocery shopping",
        amount: -1500000,
        date: "2025-12-28",
        category: "Food",
      },
      {
        id: 2,
        description: "Salary",
        amount: 25000000,
        date: "2025-12-25",
        category: "Income",
      },
      {
        id: 3,
        description: "Utilities",
        amount: -800000,
        date: "2025-12-24",
        category: "Bills",
      },
    ],
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t("dashboard.dashboard")}</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label={t("financial.totalIncome")}
          value={formatCurrency(data.totalIncome, "VND")}
          positive
        />
        <SummaryCard
          label={t("financial.totalExpense")}
          value={formatCurrency(data.totalExpense, "VND")}
          negative
        />
        <SummaryCard
          label={t("financial.netIncome")}
          value={formatCurrency(data.netIncome, "VND")}
          positive
        />
        <SummaryCard
          label={t("financial.savingsRate")}
          value={formatPercentage(data.savingsRate)}
          positive
        />
      </div>

      {/* Transactions */}
      <div className="rounded-lg border">
        <div className="border-b px-6 py-4">
          <h3 className="font-semibold">{t("transaction.recentActivity")}</h3>
        </div>
        <div className="divide-y">
          {data.transactions.map((transaction) => (
            <div key={transaction.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <p className="text-sm text-gray-500">
                    {transaction.category} • {formatDate(transaction.date)}
                  </p>
                </div>
                <p
                  className={`font-mono font-medium ${
                    transaction.amount < 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {formatCurrency(transaction.amount, "VND")}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  positive = false,
  negative = false,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        positive
          ? "border-green-200 bg-green-50"
          : negative
          ? "border-red-200 bg-red-50"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

/**
 * Example 6: Language Switcher Integration
 *
 * Shows how to integrate the language switcher component
 */
export function ExampleLanguageSwitcher() {
  const { locale } = useI18n();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Language Switcher</h2>

      <div className="rounded-lg border p-4">
        <p className="mb-4 text-sm text-gray-600">
          Current locale: <span className="font-mono">{locale}</span>
        </p>

        {/* Language switcher would be rendered here */}
        {/* <LanguageSwitcher currentLocale={locale} /> */}
      </div>

      <p className="text-sm text-gray-500">
        Import and use the LanguageSwitcher component to allow users to
        switch languages.
      </p>
    </div>
  );
}
