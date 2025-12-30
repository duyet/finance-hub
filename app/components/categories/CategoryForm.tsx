/**
 * CategoryForm Component
 *
 * Form for creating or editing categories
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Tag, DollarSign } from "lucide-react";
import type { CategoryRow, CreateCategoryInput, UpdateCategoryInput } from "~/lib/db/categories.server";
import { COLOR_THEMES, ICON_PRESETS_ARRAY } from "./category-presets";

// Use array format directly
const iconPresetsList = ICON_PRESETS_ARRAY.map((preset) => ({
  key: preset.label.toLowerCase(),
  icon: preset.icon,
  label: preset.label,
  category: preset.category,
}));

interface CategoryFormProps {
  onSubmit: (data: CreateCategoryInput | UpdateCategoryInput) => void;
  onCancel?: () => void;
  initialData?: Partial<CategoryRow>;
  parentOptions?: Array<{ id: string; name: string }>;
  isLoading?: boolean;
  mode?: "create" | "edit";
}

export function CategoryForm({
  onSubmit,
  onCancel,
  initialData,
  parentOptions = [],
  isLoading = false,
  mode = "create",
}: CategoryFormProps) {
  const [formData, setFormData] = useState<CreateCategoryInput | UpdateCategoryInput>({
    name: initialData?.name || "",
    type: initialData?.type || "EXPENSE",
    parentId: initialData?.parent_id || null,
    budgetLimit: initialData?.budget_limit || undefined,
    colorTheme: initialData?.color_theme || "blue",
    icon: initialData?.icon || "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof (CreateCategoryInput | UpdateCategoryInput), string>>>({});

  // Update parent options when category type changes
  const [categoryType, setCategoryType] = useState<"INCOME" | "EXPENSE">(
    initialData?.type || "EXPENSE"
  );

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof (CreateCategoryInput | UpdateCategoryInput), string>> = {};

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
      onSubmit(formData);
    }
  };

  const handleChange = (
    field: keyof (CreateCategoryInput | UpdateCategoryInput),
    value: CreateCategoryInput[typeof field] | UpdateCategoryInput[typeof field] | null
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleTypeChange = (type: "INCOME" | "EXPENSE") => {
    setCategoryType(type);
    handleChange("type", type);
    // Reset parent when type changes
    handleChange("parentId", null);
  };

  // Filter parent options by current category type
  const availableParentOptions = parentOptions;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag className="w-5 h-5" />
          {mode === "edit" ? "Edit Category" : "Create New Category"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Groceries, Salary, Entertainment"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type as string}
                onValueChange={(value) => handleTypeChange(value as "INCOME" | "EXPENSE")}
              >
                <SelectTrigger id="type" className={errors.type ? "border-red-500" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">
                    <span className="flex items-center gap-2">
                      <span>💵</span>
                      <span>Income</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="EXPENSE">
                    <span className="flex items-center gap-2">
                      <span>💸</span>
                      <span>Expense</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.type && <p className="text-sm text-red-600">{errors.type}</p>}
            </div>

            {/* Parent Category (for nested categories) */}
            {mode === "create" && availableParentOptions.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="parent">Parent Category (Optional)</Label>
                <Select
                  value={formData.parentId || "none"}
                  onValueChange={(value) => handleChange("parentId", value === "none" ? null : value)}
                >
                  <SelectTrigger id="parent">
                    <SelectValue placeholder="No parent (top-level category)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent (top-level category)</SelectItem>
                    {availableParentOptions.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Create a subcategory under an existing category
                </p>
              </div>
            )}
          </div>

          {/* Budget Settings (for expense categories only) */}
          {formData.type === "EXPENSE" && (
            <div className="space-y-4 pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Budget Settings
              </h3>

              <div className="space-y-2">
                <Label htmlFor="budget">Monthly Budget Limit (Optional)</Label>
                <Input
                  id="budget"
                  type="number"
                  min={0}
                  step={1}
                  placeholder="e.g., 500"
                  value={formData.budgetLimit || ""}
                  onChange={(e) =>
                    handleChange("budgetLimit", e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  className={errors.budgetLimit ? "border-red-500" : ""}
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

            {/* Color Theme */}
            <div className="space-y-2">
              <Label>Color Theme</Label>
              <div className="grid grid-cols-7 gap-2">
                {COLOR_THEMES.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleChange("colorTheme", color.value)}
                    className={`h-10 rounded-lg ${color.class} ${
                      formData.colorTheme === color.value ? "ring-2 ring-offset-2 ring-gray-900" : ""
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Icon Selection */}
            <div className="space-y-2">
              <Label>Icon (Optional)</Label>
              <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                <button
                  type="button"
                  onClick={() => handleChange("icon", "")}
                  className={`h-10 rounded flex items-center justify-center text-lg ${
                    !formData.icon ? "bg-blue-100 ring-2 ring-blue-500" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                  title="No icon"
                >
                  -
                </button>
                {iconPresetsList
                  .filter((preset) => {
                    // Show all icons when no type selected, or filter by type
                    if (!formData.type) return true;
                    return preset.category === formData.type.toLowerCase();
                  })
                  .map((preset) => (
                    <button
                      key={preset.key}
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
              {formData.icon && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Selected icon:</span>
                  <span className="text-2xl">{formData.icon}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Saving..." : mode === "edit" ? "Update Category" : "Create Category"}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
