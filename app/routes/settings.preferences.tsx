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
  DATE_FORMATS,
  CURRENCY_FORMATS,
  THEME_OPTIONS,
  LANGUAGE_OPTIONS,
} from "../lib/services/settings.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
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

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    preferences,
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

  return { success: false, errors: { form: "Invalid action" } };
}

export default function PreferencesSettingsPage() {
  const { user, preferences } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const errors = actionData?.errors || {};
  const success = actionData?.success;

  // Use updated preferences if available, otherwise use loader data
  const currentPreferences = actionData?.preferences || preferences;

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
