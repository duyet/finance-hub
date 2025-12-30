/**
 * Categories List Page
 *
 * Displays all categories with budget tracking and statistics
 */

import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { useLoaderData, useNavigate, useNavigation, Form } from "react-router";
import { lazy, Suspense, useState } from "react";
import { requireAuth } from "~/lib/auth/session.server";
import { getDb } from "~/lib/auth/db.server";
import { categoriesCrud } from "~/lib/db/categories.server";
import type { CategoryWithStats, CreateCategoryInput, UpdateCategoryInput } from "~/lib/db/categories.types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { useToast } from "~/components/ui/use-toast";
import { COLOR_THEMES, ICON_PRESETS_ARRAY } from "~/components/categories/category-presets";

// Lazy load CategoryGrid for code splitting
const CategoryGrid = lazy(() =>
  import("~/components/categories/CategoryGrid").then(m => ({ default: m.CategoryGrid }))
);

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await requireAuth(request);
  const db = getDb(request);

  // Fetch all data in parallel for better performance
  const [categories, incomeParents, expenseParents] = await Promise.all([
    categoriesCrud.getCategories(db, user.id, {}),
    categoriesCrud.getParentOptions(db, user.id, "INCOME"),
    categoriesCrud.getParentOptions(db, user.id, "EXPENSE"),
  ]);

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

  if (intent === "update") {
    const categoryId = formData.get("categoryId") as string;
    const data: UpdateCategoryInput = {
      name: formData.get("name") as string,
      budgetLimit: formData.get("budgetLimit")
        ? parseFloat(formData.get("budgetLimit") as string)
        : null,
      colorTheme: (formData.get("colorTheme") as string) || null,
      icon: (formData.get("icon") as string) || null,
    };

    await categoriesCrud.updateCategory(db, categoryId, user.id, data);
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
  const navigate = useNavigate();
  const navigation = useNavigation();
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithStats | null>(null);
  const isSubmitting = navigation.state === "submitting";

  // Handle edit category - open edit dialog with category data
  const handleEdit = (id: string) => {
    const category = categories.find((c) => c.id === id);
    if (category) {
      setEditingCategory(category);
      setIsEditDialogOpen(true);
    }
  };

  // Handle delete category
  const handleDelete = async (id: string) => {
    toast({ title: "Deleting category..." });
    const formData = new FormData();
    formData.set("intent", "delete");
    formData.set("categoryId", id);

    await fetch("/categories", {
      method: "POST",
      body: formData,
    });

    navigate(0);
  };

  // Handle edit category submit
  const handleEditCategorySubmit = () => {
    toast({ title: "Updating category..." });
  };

  // Handle add category submit with toast
  const handleAddCategorySubmit = () => {
    toast({ title: "Creating category..." });
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
                aria-label="Back to dashboard"
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
        <Suspense fallback={<div className="h-96 animate-pulse bg-muted rounded" />}>
          <CategoryGrid
            categories={categories}
            onAddCategory={() => setIsAddDialogOpen(true)}
            onEditCategory={handleEdit}
            onDeleteCategory={handleDelete}
          />
        </Suspense>

        {/* Add Category Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Category</DialogTitle>
            </DialogHeader>
            <Form method="post" onSubmit={() => {
              handleAddCategorySubmit();
              setIsAddDialogOpen(false);
            }}>
              <input type="hidden" name="intent" value="create" />
              <CategoryFormContent
                parentOptionsINCOME={parentOptions.INCOME}
                parentOptionsEXPENSE={parentOptions.EXPENSE}
                onCancel={() => setIsAddDialogOpen(false)}
                isSubmitting={isSubmitting}
              />
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingCategory(null);
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            {editingCategory && (
              <Form method="post" onSubmit={() => {
                handleEditCategorySubmit();
                setIsEditDialogOpen(false);
                setEditingCategory(null);
              }}>
                <input type="hidden" name="intent" value="update" />
                <input type="hidden" name="categoryId" value={editingCategory.id} />
                <EditCategoryFormContent
                  category={editingCategory}
                  onCancel={() => {
                    setIsEditDialogOpen(false);
                    setEditingCategory(null);
                  }}
                  isSubmitting={isSubmitting}
                />
              </Form>
            )}
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
  isSubmitting = false,
}: {
  parentOptionsINCOME: Array<{ id: string; name: string }>;
  parentOptionsEXPENSE: Array<{ id: string; name: string }>;
  onCancel: () => void;
  isSubmitting?: boolean;
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
      const form = e.target as unknown as HTMLFormElement;
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
            {ICON_PRESETS_ARRAY.map((preset) => (
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
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating..." : "Create Category"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Inline edit form component for the edit dialog
 */
function EditCategoryFormContent({
  category,
  onCancel,
  isSubmitting = false,
}: {
  category: CategoryWithStats;
  onCancel: () => void;
  isSubmitting?: boolean;
}) {
  const [formData, setFormData] = useState({
    name: category.name,
    budgetLimit: category.budget_limit,
    colorTheme: category.color_theme || "blue",
    icon: category.icon || "",
  });

  const [errors, setErrors] = useState<Partial<Record<"name" | "budgetLimit", string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<"name" | "budgetLimit", string>> = {};

    if (!formData.name?.trim()) {
      newErrors.name = "Category name is required";
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
      const form = e.target as unknown as HTMLFormElement;
      form.submit();
    }
  };

  const handleChange = (field: keyof typeof formData, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Filter icons by category type
  const applicableIcons = category.type === "INCOME"
    ? ICON_PRESETS_ARRAY.filter((i) => i.category === "income")
    : ICON_PRESETS_ARRAY.filter((i) => i.category === "expense");

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>

        <div className="space-y-2">
          <label htmlFor="edit-name" className="text-sm font-medium">
            Category Name *
          </label>
          <input
            id="edit-name"
            name="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={`w-full px-3 py-2 border rounded-md ${
              errors.name ? "border-red-500" : "border-gray-300"
            }`}
            required
          />
          {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
        </div>

        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Type:</span> {category.type === "INCOME" ? "💵 Income" : "💸 Expense"}
          </p>
        </div>
      </div>

      {/* Budget Settings - only for expense categories */}
      {category.type === "EXPENSE" && (
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-sm font-semibold text-gray-900">Budget Settings</h3>

          <div className="space-y-2">
            <label htmlFor="edit-budgetLimit" className="text-sm font-medium">
              Monthly Budget Limit (Optional)
            </label>
            <input
              id="edit-budgetLimit"
              name="budgetLimit"
              type="number"
              min={0}
              step={1}
              value={formData.budgetLimit ?? ""}
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
          <input type="hidden" name="colorTheme" value={formData.colorTheme} />
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
          <input type="hidden" name="icon" value={formData.icon} />
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
            {applicableIcons.map((preset) => (
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
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
