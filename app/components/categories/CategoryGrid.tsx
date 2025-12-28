/**
 * CategoryGrid Component
 *
 * Grid layout displaying categories with type filtering
 */

import { CategoryWithStats } from "~/lib/db/categories.server";
import { CategoryCard, CategoryCardCompact } from "./CategoryCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useState } from "react";
import { useI18n } from "~/lib/i18n/client";
import { Plus } from "lucide-react";
import { Button } from "~/components/ui/button";

interface CategoryGridProps {
  categories: CategoryWithStats[];
  onAddCategory?: () => void;
  onEditCategory?: (id: string) => void;
  onDeleteCategory?: (id: string) => void;
  compact?: boolean;
}

export function CategoryGrid({
  categories,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
  compact = false,
}: CategoryGridProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");

  // Filter categories by type
  const filteredCategories =
    activeTab === "ALL" ? categories : categories.filter((c) => c.type === activeTab);

  // Count categories by type
  const incomeCount = categories.filter((c) => c.type === "INCOME").length;
  const expenseCount = categories.filter((c) => c.type === "EXPENSE").length;

  if (categories.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <Plus className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories yet</h3>
        <p className="text-gray-600 mb-6">
          Create categories to organize your income and expenses
        </p>
        {onAddCategory && (
          <button
            onClick={onAddCategory}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Your First Category
          </button>
        )}
      </div>
    );
  }

  const CardComponent = compact ? CategoryCardCompact : CategoryCard;

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="ALL">
              All ({categories.length})
            </TabsTrigger>
            <TabsTrigger value="INCOME">
              Income ({incomeCount})
            </TabsTrigger>
            <TabsTrigger value="EXPENSE">
              Expenses ({expenseCount})
            </TabsTrigger>
          </TabsList>

          {onAddCategory && (
            <Button onClick={onAddCategory}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          )}
        </div>

        <TabsContent value="ALL" className="mt-0">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No categories found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map((category) => (
                <CardComponent
                  key={category.id}
                  category={category}
                  onEdit={onEditCategory}
                  onDelete={onDeleteCategory}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="INCOME" className="mt-0">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No income categories found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map((category) => (
                <CardComponent
                  key={category.id}
                  category={category}
                  onEdit={onEditCategory}
                  onDelete={onDeleteCategory}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="EXPENSE" className="mt-0">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No expense categories found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map((category) => (
                <CardComponent
                  key={category.id}
                  category={category}
                  onEdit={onEditCategory}
                  onDelete={onDeleteCategory}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
          <div className="text-sm text-gray-600">Total Categories</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{incomeCount}</div>
          <div className="text-sm text-gray-600">Income</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">{expenseCount}</div>
          <div className="text-sm text-gray-600">Expenses</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {categories.filter((c) => c.budget_limit).length}
          </div>
          <div className="text-sm text-gray-600">With Budgets</div>
        </div>
      </div>
    </div>
  );
}
