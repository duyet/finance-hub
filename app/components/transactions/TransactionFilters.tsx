import { Form } from "react-router";
import { useState } from "react";
import { X } from "lucide-react";
import { z } from "zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Checkbox } from "~/components/ui/checkbox";
import { TransactionFilterOptions, TransactionType, TransactionStatus } from "~/lib/db/transactions.server";

/**
 * Transaction filters props
 */
interface TransactionFiltersProps {
  filterOptions: TransactionFilterOptions;
  currentFilters: z.infer<typeof import("~/lib/validations/transaction").transactionFilterSchema>;
}

/**
 * Account filter checkbox item
 */
interface AccountFilterItemProps {
  account: { id: string; name: string; type: string };
  isSelected: boolean;
  onToggle: (id: string) => void;
}

function AccountFilterItem({ account, isSelected, onToggle }: AccountFilterItemProps) {
  return (
    <div className="flex items-center space-x-2 py-1">
      <Checkbox
        id={`account-${account.id}`}
        checked={isSelected}
        onCheckedChange={() => onToggle(account.id)}
      />
      <Label
        htmlFor={`account-${account.id}`}
        className="text-sm font-normal cursor-pointer flex-1"
      >
        <span>{account.name}</span>
        <span className="text-muted-foreground ml-2 text-xs">
          ({account.type})
        </span>
      </Label>
    </div>
  );
}

/**
 * Category filter checkbox item
 */
interface CategoryFilterItemProps {
  category: { id: string; name: string; type: string; color?: string | null };
  isSelected: boolean;
  onToggle: (id: string) => void;
}

function CategoryFilterItem({ category, isSelected, onToggle }: CategoryFilterItemProps) {
  return (
    <div className="flex items-center space-x-2 py-1">
      <Checkbox
        id={`category-${category.id}`}
        checked={isSelected}
        onCheckedChange={() => onToggle(category.id)}
      />
      <Label
        htmlFor={`category-${category.id}`}
        className="text-sm font-normal cursor-pointer flex-1"
      >
        <span>{category.name}</span>
        <span className={`ml-2 text-xs ${
          category.type === "INCOME" ? "text-green-600" : "text-orange-600"
        }`}>
          ({category.type.toLowerCase()})
        </span>
      </Label>
    </div>
  );
}

/**
 * Transaction filters component
 * Provides filtering UI for transactions list
 */
export function TransactionFilters({ filterOptions, currentFilters }: TransactionFiltersProps) {
  const [localFilters, setLocalFilters] = useState({
    search: currentFilters.search || "",
    type: currentFilters.type || "ALL",
    status: currentFilters.status,
    accountIds: currentFilters.accountIds || [],
    categoryIds: currentFilters.categoryIds || [],
    startDate: currentFilters.startDate || "",
    endDate: currentFilters.endDate || "",
  });

  const hasActiveFilters =
    localFilters.search ||
    localFilters.type !== "ALL" ||
    localFilters.status ||
    (localFilters.accountIds && localFilters.accountIds.length > 0) ||
    (localFilters.categoryIds && localFilters.categoryIds.length > 0) ||
    localFilters.startDate ||
    localFilters.endDate;

  const handleAccountToggle = (accountId: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      accountIds: prev.accountIds?.includes(accountId)
        ? prev.accountIds.filter((id) => id !== accountId)
        : [...(prev.accountIds || []), accountId],
    }));
  };

  const handleCategoryToggle = (categoryId: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds?.includes(categoryId)
        ? prev.categoryIds.filter((id) => id !== categoryId)
        : [...(prev.categoryIds || []), categoryId],
    }));
  };

  const handleClearFilters = () => {
    setLocalFilters({
      search: "",
      type: "ALL",
      status: undefined,
      accountIds: [],
      categoryIds: [],
      startDate: "",
      endDate: "",
    });
  };

  return (
    <div className="space-y-4">
      {/* Search and Quick Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search */}
        <div className="md:col-span-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            type="text"
            placeholder="Search by description or merchant..."
            value={localFilters.search}
            onChange={(e) =>
              setLocalFilters((prev) => ({ ...prev, search: e.target.value }))
            }
            className="mt-1"
          />
        </div>

        {/* Type Filter */}
        <div>
          <Label htmlFor="type">Type</Label>
          <Select
            value={localFilters.type}
            onValueChange={(value) =>
              setLocalFilters((prev) => ({ ...prev, type: value as TransactionType }))
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={localFilters.status || "all"}
            onValueChange={(value) =>
              setLocalFilters((prev) => ({
                ...prev,
                status: value === "all" ? undefined : (value as TransactionStatus),
              }))
            }
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="POSTED">Posted</SelectItem>
              <SelectItem value="CLEARED">Cleared</SelectItem>
              <SelectItem value="RECONCILED">Reconciled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Date Range and Multi-select Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Date Range */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="startDate" className="text-xs text-muted-foreground">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={localFilters.startDate}
                onChange={(e) =>
                  setLocalFilters((prev) => ({ ...prev, startDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="endDate" className="text-xs text-muted-foreground">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={localFilters.endDate}
                onChange={(e) =>
                  setLocalFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        {/* Clear Filters Button */}
        <div className="flex items-end">
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Account Filter */}
      {filterOptions.accounts.length > 0 && (
        <details className="group" open={localFilters.accountIds.length > 0}>
          <summary className="flex items-center justify-between cursor-pointer list-none py-2">
            <Label className="cursor-pointer">Accounts</Label>
            <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <div className="mt-2 p-4 border rounded-lg max-h-48 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
            {filterOptions.accounts.map((account) => (
              <AccountFilterItem
                key={account.id}
                account={account}
                isSelected={localFilters.accountIds?.includes(account.id) || false}
                onToggle={handleAccountToggle}
              />
            ))}
          </div>
        </details>
      )}

      {/* Category Filter */}
      {filterOptions.categories.length > 0 && (
        <details className="group" open={localFilters.categoryIds.length > 0}>
          <summary className="flex items-center justify-between cursor-pointer list-none py-2">
            <Label className="cursor-pointer">Categories</Label>
            <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
              ▼
            </span>
          </summary>
          <div className="mt-2 p-4 border rounded-lg max-h-48 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
            {filterOptions.categories.map((category) => (
              <CategoryFilterItem
                key={category.id}
                category={category}
                isSelected={localFilters.categoryIds?.includes(category.id) || false}
                onToggle={handleCategoryToggle}
              />
            ))}
          </div>
        </details>
      )}

      {/* Apply Filters Button */}
      <Form method="get" action="/transactions">
        <input type="hidden" name="search" value={localFilters.search} />
        <input type="hidden" name="type" value={localFilters.type} />
        <input type="hidden" name="status" value={localFilters.status || ""} />
        <input
          type="hidden"
          name="accountIds"
          value={localFilters.accountIds?.join(",") || ""}
        />
        <input
          type="hidden"
          name="categoryIds"
          value={localFilters.categoryIds?.join(",") || ""}
        />
        <input type="hidden" name="startDate" value={localFilters.startDate} />
        <input type="hidden" name="endDate" value={localFilters.endDate} />
        <input type="hidden" name="page" value="1" />

        <Button type="submit" className="w-full">
          Apply Filters
        </Button>
      </Form>
    </div>
  );
}
