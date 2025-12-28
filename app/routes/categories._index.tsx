/**
 * Categories List Page
 *
 * Displays all categories with budget tracking and statistics
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { useLoaderData, useNavigate, Form } from "react-router";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import { categoriesCrud, type CategoryWithStats } from "~/lib/db/categories.server";
import { CategoryGrid } from "~/components/categories/CategoryGrid";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { useState } from "react";
import { useI18n } from "~/lib/i18n/client";
import type { CreateCategoryInput, UpdateCategoryInput } from "~/lib/db/categories.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Fetch all categories with statistics
  const categories = await categoriesCrud.getCategories(db, user.id, {});

  // Get parent options for creating new categories
  const incomeParents = await categoriesCrud.getParentOptions(db, user.id, "INCOME");
  const expenseParents = await categoriesCrud.getParentOptions(db, user.id, "EXPENSE");

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    categories,
    parentOptions: {
      INCOME: incomeParents,
      EXPENSE: expenseParents,
    },
  };
}

export async function action({ request }: ActionFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "create") {
    const data: CreateCategoryInput = {
      name: formData.get("name") as string,
      type: formData.get("type") as "INCOME" | "EXPENSE",
      parentId: (formData.get("parentId") as string) || null,
      budgetLimit: formData.get("budgetLimit")
        ? parseFloat(formData.get("budgetLimit") as string)
        : undefined,
      colorTheme: (formData.get("colorTheme") as string) || null,
      icon: (formData.get("icon") as string) || null,
    };

    await categoriesCrud.createCategory(db, user.id, data);
    return redirect("/categories");
  }

  if (intent === "delete") {
    const categoryId = formData.get("categoryId") as string;
    await categoriesCrud.deleteCategory(db, categoryId, user.id);
    return redirect("/categories");
  }

  return { success: false };
}

export default function CategoriesIndexPage() {
  const { categories, parentOptions } = useLoaderData<typeof loader>();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Handle delete category
  const handleDelete = async (id: string) => {
    const formData = new FormData();
    formData.set("intent", "delete");
    formData.set("categoryId", id);

    await fetch("/categories", {
      method: "POST",
      body: formData,
    });

    window.location.reload();
  };

  // Handle edit category - navigate to edit page
  const handleEdit = (id: string) => {
    navigate(`/categories/${id}/edit`);
  };

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
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-indigo-600">Finance Hub</h1>
              <span className="text-gray-300">|</span>
              <span className="text-gray-600">Categories</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Categories</h2>
          <p className="mt-2 text-gray-600">
            Manage your income and expense categories with budget tracking
          </p>
        </div>

        {/* Categories Grid */}
        <CategoryGrid
          categories={categories}
          onAddCategory={() => setIsAddDialogOpen(true)}
          onEditCategory={handleEdit}
          onDeleteCategory={handleDelete}
        />

        {/* Add Category Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
            </DialogHeader>
            <Form method="post" onSubmit={() => setIsAddDialogOpen(false)}>
              <input type="hidden" name="intent" value="create" />
              <CategoryFormContent
                parentOptionsINCOME={parentOptions.INCOME}
                parentOptionsEXPENSE={parentOptions.EXPENSE}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </Form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

/**
 * Inline form component for the dialog
 * This avoids needing to import the CategoryForm component in this file
 */
function CategoryFormContent({
  parentOptionsINCOME,
  parentOptionsEXPENSE,
  onCancel,
}: {
  parentOptionsINCOME: Array<{ id: string; name: string }>;
  parentOptionsEXPENSE: Array<{ id: string; name: string }>;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<CreateCategoryInput>({
    name: "",
    type: "EXPENSE",
    parentId: null,
    budgetLimit: undefined,
    colorTheme: "blue",
    icon: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof CreateCategoryInput, string>>>({});
  const [categoryType, setCategoryType] = useState<"INCOME" | "EXPENSE">("EXPENSE");

  const COLOR_THEMES = [
    { value: "red", label: "Red", class: "bg-red-500" },
    { value: "pink", label: "Pink", class: "bg-pink-500" },
    { value: "purple", label: "Purple", class: "bg-purple-500" },
    { value: "indigo", label: "Indigo", class: "bg-indigo-500" },
    { value: "blue", label: "Blue", class: "bg-blue-500" },
    { value: "cyan", label: "Cyan", class: "bg-cyan-500" },
    { value: "teal", label: "Teal", class: "bg-teal-500" },
    { value: "green", label: "Green", class: "bg-green-500" },
    { value: "lime", label: "Lime", class: "bg-lime-500" },
    { value: "yellow", label: "Yellow", class: "bg-yellow-500" },
    { value: "orange", label: "Orange", class: "bg-orange-500" },
    { value: "brown", label: "Brown", class: "bg-amber-500" },
    { value: "gray", label: "Gray", class: "bg-gray-500" },
    { value: "slate", label: "Slate", class: "bg-slate-500" },
  ];

  const ICON_PRESETS = [
    { icon: "💰", label: "Salary", category: "income" },
    { icon: "🎁", label: "Bonus", category: "income" },
    { icon: "📈", label: "Investment", category: "income" },
    { icon: "💼", label: "Freelance", category: "income" },
    { icon: "🎀", label: "Gift", category: "income" },
    { icon: "↩️", label: "Refund", category: "income" },
    { icon: "🍔", label: "Food", category: "expense" },
    { icon: "🛒", label: "Groceries", category: "expense" },
    { icon: "🍽️", label: "Restaurant", category: "expense" },
    { icon: "☕", label: "Coffee", category: "expense" },
    { icon: "🚗", label: "Transport", category: "expense" },
    { icon: "⛽", label: "Gas", category: "expense" },
    { icon: "🅿️", label: "Parking", category: "expense" },
    { icon: "🛍️", label: "Shopping", category: "expense" },
    { icon: "👕", label: "Clothing", category: "expense" },
    { icon: "📱", label: "Electronics", category: "expense" },
    { icon: "💡", label: "Utilities", category: "expense" },
    { icon: "🏠", label: "Rent", category: "expense" },
    { icon: "🛡️", label: "Insurance", category: "expense" },
    { icon: "🎬", label: "Entertainment", category: "expense" },
    { icon: "🎮", label: "Games", category: "expense" },
    { icon: "🎵", label: "Music", category: "expense" },
    { icon: "🏥", label: "Health", category: "expense" },
    { icon: "💊", label: "Pharmacy", category: "expense" },
    { icon: "📚", label: "Education", category: "expense" },
    { icon: "✈️", label: "Travel", category: "expense" },
    { icon: "🐕", label: "Pets", category: "expense" },
    { icon: "💪", label: "Fitness", category: "expense" },
  ];

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateCategoryInput, string>> = {};

    if (!formData.name?.trim()) {
      newErrors.name = "Category name is required";
    }
    if (!formData.type) {
      newErrors.type = "Category type is required";
    }
    if (formData.budgetLimit !== null && formData.budgetLimit !== undefined && formData.budgetLimit < 0) {
      newErrors.budgetLimit = "Budget limit must be positive";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Form will be submitted by the Form component
      const form = e.target as HTMLFormElement;
      form.submit();
    }
  };

  const handleChange = (field: keyof CreateCategoryInput, value: CreateCategoryInput[keyof CreateCategoryInput]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleTypeChange = (type: "INCOME" | "EXPENSE") => {
    setCategoryType(type);
    handleChange("type", type);
    handleChange("parentId", null);
  };

  const availableParentOptions =
    categoryType === "INCOME" ? parentOptionsINCOME : parentOptionsEXPENSE;

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Category Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="e.g., Groceries, Salary, Entertainment"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
            required
          />
          {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
        </div>

        <div className="space-y-2">
          <label htmlFor="type" className="text-sm font-medium">
            Type *
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={(e) => handleTypeChange(e.target.value as "INCOME" | "EXPENSE")}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.type ? "border-red-500" : "border-gray-300"
            }`}
            required
          >
            <option value="INCOME">💵 Income</option>
            <option value="EXPENSE">💸 Expense</option>
          </select>
          {errors.type && <p className="text-sm text-red-600">{errors.type}</p>}
        </div>

        {availableParentOptions.length > 0 && (
          <div className="space-y-2">
            <label htmlFor="parentId" className="text-sm font-medium">
              Parent Category (Optional)
            </label>
            <select
              id="parentId"
              name="parentId"
              value={formData.parentId || "none"}
              onChange={(e) =>
                handleChange("parentId", e.target.value === "none" ? null : e.target.value)
              }
              className="w-full px-3 py-2 border rounded-md border-gray-300"
            >
              <option value="none">No parent (top-level category)</option>
              {availableParentOptions.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500">
              Create a subcategory under an existing category
            </p>
          </div>
        )}
      </div>

      {/* Budget Settings */}
      {formData.type === "EXPENSE" && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-semibold text-gray-900">Budget Settings</h3>

          <div className="space-y-2">
            <label htmlFor="budgetLimit" className="text-sm font-medium">
              Monthly Budget Limit (Optional)
            </label>
            <input
              id="budgetLimit"
              name="budgetLimit"
              type="number"
              min={0}
              step={1}
              placeholder="e.g., 500"
              value={formData.budgetLimit || ""}
              onChange={(e) =>
                handleChange("budgetLimit", e.target.value ? parseFloat(e.target.value) : undefined)
              }
              className={`w-full px-3 py-2 border rounded-md ${
                errors.budgetLimit ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.budgetLimit && <p className="text-sm text-red-600">{errors.budgetLimit}</p>}
            <p className="text-xs text-gray-500">
              Set a monthly spending limit for this category
            </p>
          </div>
        </div>
      )}

      {/* Appearance */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-semibold text-gray-900">Appearance</h3>

        <div className="space-y-2">
          <label className="text-sm font-medium">Color Theme</label>
          <input type="hidden" name="colorTheme" value={formData.colorTheme ?? "blue"} />
          <div className="grid grid-cols-7 gap-2">
            {COLOR_THEMES.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => handleChange("colorTheme", color.value)}
                className={`h-10 rounded-lg ${color.class} ${
                  formData.colorTheme === color.value
                    ? "ring-2 ring-offset-2 ring-gray-900"
                    : ""
                }`}
                title={color.label}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Icon (Optional)</label>
          <input type="hidden" name="icon" value={formData.icon ?? ""} />
          <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
            <button
              type="button"
              onClick={() => handleChange("icon", "")}
              className={`h-10 rounded flex items-center justify-center text-lg ${
                !formData.icon
                  ? "bg-blue-100 ring-2 ring-blue-500"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              title="No icon"
            >
              -
            </button>
            {ICON_PRESETS.map((preset) => (
              <button
                key={preset.icon}
                type="button"
                onClick={() => handleChange("icon", preset.icon)}
                className={`h-10 rounded flex items-center justify-center text-lg ${
                  formData.icon === preset.icon
                    ? "bg-blue-100 ring-2 ring-blue-500"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
                title={preset.label}
              >
                {preset.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          onClick={handleSubmit}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create Category
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
