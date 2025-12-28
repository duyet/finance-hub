/**
 * Profile Settings Page
 *
 * User profile management including:
 * - Display name editing
 * - Email display (read-only)
 * - Avatar display
 * - Default currency preference
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useActionData, Form } from "react-router";
import { requireAuth } from "../lib/auth/session.server";
import { getDb } from "../lib/auth/db.server";
import { getUserProfile, updateUserProfile } from "../lib/services/settings.server";
import { Sidebar } from "~/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
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

  const profile = await getUserProfile(db, user.id);

  if (!profile) {
    throw new Response("Profile not found", { status: 404 });
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    profile,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update-profile") {
    const name = formData.get("name") as string | undefined;
    const defaultCurrency = formData.get("defaultCurrency") as string | undefined;

    // Validation
    const errors: Record<string, string> = {};

    if (!name || name.trim().length === 0) {
      errors.name = "Name is required";
    } else if (name.trim().length > 100) {
      errors.name = "Name must be less than 100 characters";
    }

    if (!defaultCurrency) {
      errors.defaultCurrency = "Currency is required";
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    try {
      const updatedProfile = await updateUserProfile(db, user.id, {
        name: name?.trim() || "",
        defaultCurrency: defaultCurrency || "VND",
      });

      return {
        success: true,
        message: "Profile updated successfully",
        profile: updatedProfile,
      };
    } catch (error) {
      console.error("Error updating profile:", error);
      return {
        success: false,
        errors: { form: "Failed to update profile. Please try again." },
      };
    }
  }

  return { success: false, errors: { form: "Invalid action" } };
}

// Common currency options
const CURRENCY_OPTIONS = [
  { value: "VND", label: "Vietnamese Dong (₫)", symbol: "₫" },
  { value: "USD", label: "US Dollar ($)", symbol: "$" },
  { value: "EUR", label: "Euro (€)", symbol: "€" },
  { value: "GBP", label: "British Pound (£)", symbol: "£" },
  { value: "JPY", label: "Japanese Yen (¥)", symbol: "¥" },
  { value: "KRW", label: "South Korean Won (₩)", symbol: "₩" },
  { value: "CNY", label: "Chinese Yuan (¥)", symbol: "¥" },
  { value: "SGD", label: "Singapore Dollar (S$)", symbol: "S$" },
  { value: "AUD", label: "Australian Dollar (A$)", symbol: "A$" },
  { value: "CAD", label: "Canadian Dollar (C$)", symbol: "C$" },
];

export default function ProfileSettingsPage() {
  const { user, profile } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  const errors = actionData?.errors || {};
  const success = actionData?.success;

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      <main className="lg:ml-64">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8 pt-4 lg:pt-0">
            <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
            <p className="mt-2 text-gray-600">
              Manage your personal information and display preferences
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

          {/* Profile Information Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal details and default currency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form method="post" className="space-y-6">
                <input type="hidden" name="intent" value="update-profile" />

                {/* Avatar Display */}
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 border-gray-300">
                    {profile.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name || "User avatar"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl text-gray-500">
                        {profile.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Profile Photo</p>
                    <p className="text-sm text-gray-500">
                      Your avatar is managed through your OAuth provider
                    </p>
                  </div>
                </div>

                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Display Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={profile.name || ""}
                    placeholder="Enter your name"
                    aria-invalid={errors.name ? "true" : undefined}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Email Display (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="text"
                    value={profile.email}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
                  <p className="text-sm text-gray-500">
                    Email is managed through your OAuth provider and cannot be changed here
                  </p>
                </div>

                {/* Default Currency */}
                <div className="space-y-2">
                  <Label htmlFor="defaultCurrency">
                    Default Currency <span className="text-red-500">*</span>
                  </Label>
                  <Select name="defaultCurrency" defaultValue={profile.defaultCurrency}>
                    <SelectTrigger
                      id="defaultCurrency"
                      className={errors.defaultCurrency ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select your default currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.defaultCurrency && (
                    <p className="text-sm text-red-600">{errors.defaultCurrency}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    This currency will be used as the default for new transactions and reports
                  </p>
                </div>

                {/* Form Actions */}
                <div className="flex items-center gap-4 pt-4">
                  <Button type="submit" size="lg">
                    Save Changes
                  </Button>
                  <Button type="button" variant="outline" size="lg" onClick={() => window.location.reload()}>
                    Cancel
                  </Button>
                </div>
              </Form>
            </CardContent>
          </Card>

          {/* Account Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>View your account details and timestamps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Account ID</p>
                  <p className="text-sm text-gray-900 font-mono">{profile.id}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Member Since</p>
                  <p className="text-sm text-gray-900">
                    {new Date(profile.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Last Updated</p>
                  <p className="text-sm text-gray-900">
                    {new Date(profile.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
