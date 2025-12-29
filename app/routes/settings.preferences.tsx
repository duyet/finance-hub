/**
 * Preferences Settings Page
 *
 * Application preferences including:
 * - Language preference
 * - Date format preference
 * - Currency display format
 * - Theme preference (light/dark/system)
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useActionData, Form } from "react-router";
import { requireAuth } from "../lib/auth/session.server";
import { getDb } from "../lib/auth/db.server";
import {
  getUserPreferences,
  updateUserPreferences,
  getDashboardConfig,
  updateDashboardConfig,
  DATE_FORMATS,
  CURRENCY_FORMATS,
  THEME_OPTIONS,
  LANGUAGE_OPTIONS,
} from "../lib/services/settings.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  const preferences = await getUserPreferences(db, user.id);
  const dashboardConfig = await getDashboardConfig(db, user.id);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    preferences,
    dashboardConfig,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update-preferences") {
    const language = formData.get("language") as string | undefined;
    const dateFormat = formData.get("dateFormat") as string | undefined;
    const currencyFormat = formData.get("currencyFormat") as string | undefined;
    const theme = formData.get("theme") as string | undefined;

    // Validation
    const errors: Record<string, string> = {};

    if (!language || !["en", "vi"].includes(language)) {
      errors.language = "Invalid language selection";
    }

    if (!dateFormat || !DATE_FORMATS.map((f) => f.value).includes(dateFormat)) {
      errors.dateFormat = "Invalid date format selection";
    }

    if (!currencyFormat || !CURRENCY_FORMATS.map((f) => f.value).includes(currencyFormat)) {
      errors.currencyFormat = "Invalid currency format selection";
    }

    if (!theme || !["light", "dark", "system"].includes(theme)) {
      errors.theme = "Invalid theme selection";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    try {
      const updatedPreferences = await updateUserPreferences(db, user.id, {
        language: language!,
        dateFormat: dateFormat!,
        currencyFormat: currencyFormat!,
        theme: theme! as "light" | "dark" | "system",
      });

      return {
        success: true,
        message: "Preferences updated successfully",
        preferences: updatedPreferences,
      };
    } catch (error) {
      console.error("Error updating preferences:", error);
      return {
        success: false,
        errors: { form: "Failed to update preferences. Please try again." },
      };
    }
  }

  if (intent === "update-dashboard-config") {
    const showFinancialHealth = formData.get("showFinancialHealth") === "true";
    const showFinancialGoals = formData.get("showFinancialGoals") === "true";
    const showIncomeExpenseChart = formData.get("showIncomeExpenseChart") === "true";
    const showExpenseBreakdownChart = formData.get("showExpenseBreakdownChart") === "true";
    const showAIInsights = formData.get("showAIInsights") === "true";
    const showQuickActions = formData.get("showQuickActions") === "true";

    try {
      const updatedConfig = await updateDashboardConfig(db, user.id, {
        showFinancialHealth,
        showFinancialGoals,
        showIncomeExpenseChart,
        showExpenseBreakdownChart,
        showAIInsights,
        showQuickActions,
      });

      return {
        success: true,
        message: "Dashboard configuration updated successfully",
        dashboardConfig: updatedConfig,
      };
    } catch (error) {
      console.error("Error updating dashboard config:", error);
      return {
        success: false,
        errors: { form: "Failed to update dashboard configuration. Please try again." },
      };
    }
  }

  return { success: false, errors: { form: "Invalid action" } };
}

export default function PreferencesSettingsPage() {
  const { user, preferences, dashboardConfig } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const errors = actionData?.errors || {};
  const success = actionData?.success;

  // Use updated preferences if available, otherwise use loader data
  const currentPreferences = actionData?.preferences || preferences;
  const currentDashboardConfig = actionData?.dashboardConfig || dashboardConfig;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 pt-4 lg:pt-0">
            <h1 className="text-3xl font-bold text-gray-900">Preferences</h1>
            <p className="mt-2 text-gray-600">
              Customize your app experience and display settings
            </p>
          </div>

          {/* Success Message */}
          {success && actionData?.message && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800">{actionData.message}</p>
            </div>
          )}

          {/* Form Error */}
          {errors.form && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{errors.form}</p>
            </div>
          )}

          {/* Preferences Form */}
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>
                Configure how dates, currencies, and other elements are displayed throughout the app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-6">
                <input type="hidden" name="intent" value="update-preferences" />

                {/* Language Preference */}
                <div className="space-y-2">
                  <Label htmlFor="language">
                    Language <span className="text-red-500">*</span>
                  </Label>
                  <Select name="language" defaultValue={currentPreferences.language}>
                    <SelectTrigger
                      id="language"
                      className={errors.language ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select your language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          <span className="mr-2">{lang.flag}</span>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.language && (
                    <p className="text-sm text-red-600">{errors.language}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Choose the language for interface elements and labels
                  </p>
                </div>

                {/* Date Format Preference */}
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">
                    Date Format <span className="text-red-500">*</span>
                  </Label>
                  <Select name="dateFormat" defaultValue={currentPreferences.dateFormat}>
                    <SelectTrigger
                      id="dateFormat"
                      className={errors.dateFormat ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.dateFormat && (
                    <p className="text-sm text-red-600">{errors.dateFormat}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Example: {DATE_FORMATS.find((f) => f.value === currentPreferences.dateFormat)?.example}
                  </p>
                </div>

                {/* Currency Format Preference */}
                <div className="space-y-2">
                  <Label htmlFor="currencyFormat">
                    Currency Format <span className="text-red-500">*</span>
                  </Label>
                  <Select name="currencyFormat" defaultValue={currentPreferences.currencyFormat}>
                    <SelectTrigger
                      id="currencyFormat"
                      className={errors.currencyFormat ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select currency format" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_FORMATS.map((format) => (
                        <SelectItem key={format.value} value={format.value}>
                          {format.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.currencyFormat && (
                    <p className="text-sm text-red-600">{errors.currencyFormat}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Example: {CURRENCY_FORMATS.find((f) => f.value === currentPreferences.currencyFormat)?.example}
                  </p>
                </div>

                {/* Theme Preference */}
                <div className="space-y-2">
                  <Label htmlFor="theme">
                    Theme <span className="text-red-500">*</span>
                  </Label>
                  <Select name="theme" defaultValue={currentPreferences.theme}>
                    <SelectTrigger
                      id="theme"
                      className={errors.theme ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      {THEME_OPTIONS.map((theme) => (
                        <SelectItem key={theme.value} value={theme.value}>
                          <span className="mr-2">{theme.icon}</span>
                          {theme.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.theme && (
                    <p className="text-sm text-red-600">{errors.theme}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Choose your preferred color scheme. System theme follows your device settings.
                  </p>
                </div>

                {/* Form Actions */}
                <div className="flex items-center gap-4 pt-4 border-t">
                  <Button type="submit" size="lg">
                    Save Preferences
                  </Button>
                  <Button type="button" variant="outline" size="lg" onClick={() => window.location.reload()}>
                    Reset
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>

          {/* Dashboard Configuration */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Dashboard Customization</CardTitle>
              <CardDescription>
                Choose which cards and sections to display on your dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="update-dashboard-config" />

                {/* Financial Health Score */}
                <div className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <Label htmlFor="showFinancialHealth" className="cursor-pointer">
                      Financial Health Score
                    </Label>
                    <p className="text-sm text-gray-500">
                      Your overall financial health rating with recommendations
                    </p>
                  </div>
                  <Checkbox
                    id="showFinancialHealth"
                    name="showFinancialHealth"
                    defaultChecked={currentDashboardConfig.showFinancialHealth}
                    value="true"
                  />
                </div>

                {/* Financial Goals */}
                <div className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <Label htmlFor="showFinancialGoals" className="cursor-pointer">
                      Financial Goals
                    </Label>
                    <p className="text-sm text-gray-500">
                      Progress tracking for savings and debt payoff goals
                    </p>
                  </div>
                  <Checkbox
                    id="showFinancialGoals"
                    name="showFinancialGoals"
                    defaultChecked={currentDashboardConfig.showFinancialGoals}
                    value="true"
                  />
                </div>

                {/* Income vs Expense Chart */}
                <div className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <Label htmlFor="showIncomeExpenseChart" className="cursor-pointer">
                      Income vs Expense Chart
                    </Label>
                    <p className="text-sm text-gray-500">
                      Monthly income and expense comparison bar chart
                    </p>
                  </div>
                  <Checkbox
                    id="showIncomeExpenseChart"
                    name="showIncomeExpenseChart"
                    defaultChecked={currentDashboardConfig.showIncomeExpenseChart}
                    value="true"
                  />
                </div>

                {/* Expense Breakdown Chart */}
                <div className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <Label htmlFor="showExpenseBreakdownChart" className="cursor-pointer">
                      Expense Breakdown Chart
                    </Label>
                    <p className="text-sm text-gray-500">
                      Category-wise expense distribution pie chart
                    </p>
                  </div>
                  <Checkbox
                    id="showExpenseBreakdownChart"
                    name="showExpenseBreakdownChart"
                    defaultChecked={currentDashboardConfig.showExpenseBreakdownChart}
                    value="true"
                  />
                </div>

                {/* AI Insights */}
                <div className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <Label htmlFor="showAIInsights" className="cursor-pointer">
                      AI Financial Insights
                    </Label>
                    <p className="text-sm text-gray-500">
                      Chat with AI to get personalized financial advice
                    </p>
                  </div>
                  <Checkbox
                    id="showAIInsights"
                    name="showAIInsights"
                    defaultChecked={currentDashboardConfig.showAIInsights}
                    value="true"
                  />
                </div>

                {/* Quick Actions */}
                <div className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <Label htmlFor="showQuickActions" className="cursor-pointer">
                      Quick Actions
                    </Label>
                    <p className="text-sm text-gray-500">
                      Quick add buttons for transactions and accounts
                    </p>
                  </div>
                  <Checkbox
                    id="showQuickActions"
                    name="showQuickActions"
                    defaultChecked={currentDashboardConfig.showQuickActions}
                    value="true"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center gap-4 pt-4 border-t">
                  <Button type="submit" size="lg">
                    Save Dashboard Configuration
                  </Button>
                  <Button type="button" variant="outline" size="lg" onClick={() => window.location.reload()}>
                    Reset
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">About Preferences</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-800 space-y-2">
              <p>
                <strong>Language:</strong> Changes the interface language. Requires page reload to take effect.
              </p>
              <p>
                <strong>Date Format:</strong> Controls how dates are displayed across the app (transactions, reports, etc.).
              </p>
              <p>
                <strong>Currency Format:</strong> Determines how currency amounts are formatted in your financial data.
              </p>
              <p>
                <strong>Theme:</strong> Applies your preferred color scheme. System theme syncs with your device.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
