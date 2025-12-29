/**
 * Goal Form Component
 *
 * Form for creating and editing financial goals.
 */

import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { Card } from "~/components/ui/card";
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
import { Textarea } from "~/components/ui/textarea";
import { PiggyBank, TrendingDown, Target, Loader2 } from "lucide-react";
import type { CreateGoalInput, UpdateGoalInput, FinancialGoalWithProgress } from "~/lib/db/financial-goals.server";
import type { CategoryRow } from "~/lib/db/categories.server";

interface GoalFormProps {
  goal?: FinancialGoalWithProgress;
  categories: CategoryRow[];
  currency?: string;
}

export function GoalForm({ goal, categories, currency = "VND" }: GoalFormProps) {
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const [goalType, setGoalType] = useState<"savings" | "debt_payoff" | "expense_limit">(
    goal?.goal_type || "savings"
  );

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  return (
    <Form method={goal ? "post" : "post"} className="space-y-6">
      {goal && <input type="hidden" name="intent" value="update" />}
      {goal && <input type="hidden" name="goalId" value={goal.id} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Goal Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Goal Name *</Label>
          <Input
            id="name"
            name="name"
            defaultValue={goal?.name}
            placeholder="e.g., Emergency Fund, Vacation, New Car"
            required
          />
        </div>

        {/* Goal Type */}
        <div className="space-y-2">
          <Label htmlFor="goalType">Goal Type *</Label>
          <Select
            name="goalType"
            defaultValue={goalType}
            onValueChange={(value) => setGoalType(value as typeof goalType)}
            required
          >
            <SelectTrigger id="goalType">
              <SelectValue placeholder="Select goal type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="savings">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-4 h-4" />
                  <span>Savings</span>
                </div>
              </SelectItem>
              <SelectItem value="debt_payoff">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  <span>Debt Payoff</span>
                </div>
              </SelectItem>
              <SelectItem value="expense_limit">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span>Expense Limit</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Target Amount */}
        <div className="space-y-2">
          <Label htmlFor="targetAmount">
            Target Amount ({currency}) *
          </Label>
          <Input
            id="targetAmount"
            name="targetAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={goal?.target_amount || ""}
            placeholder="10000000"
            required
          />
        </div>

        {/* Current Amount */}
        <div className="space-y-2">
          <Label htmlFor="currentAmount">
            Current Amount ({currency})
          </Label>
          <Input
            id="currentAmount"
            name="currentAmount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={goal?.current_amount || 0}
            placeholder="0"
          />
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Leave at 0 for new goals. Will auto-update if linked to a category.
          </p>
        </div>

        {/* Target Date */}
        <div className="space-y-2">
          <Label htmlFor="targetDate">Target Date</Label>
          <Input
            id="targetDate"
            name="targetDate"
            type="date"
            defaultValue={goal?.target_date || ""}
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label htmlFor="priority">Priority (0-10)</Label>
          <Input
            id="priority"
            name="priority"
            type="number"
            min="0"
            max="10"
            defaultValue={goal?.priority || 5}
          />
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Higher priority goals show first
          </p>
        </div>

        {/* Category (for auto-tracking) */}
        <div className="space-y-2">
          <Label htmlFor="categoryId">Link to Category (Optional)</Label>
          <Select name="categoryId" defaultValue={goal?.category_id || ""}>
            <SelectTrigger id="categoryId">
              <SelectValue placeholder="Select category for auto-tracking" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None - Manual tracking only</SelectItem>
              {expenseCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {goalType === "savings" && "Credits to this category count toward savings goal"}
            {goalType === "debt_payoff" && "Debits to this category count toward debt payoff"}
            {goalType === "expense_limit" && "Spending in this category counts against limit"}
          </p>
        </div>

        {/* Auto Track */}
        <div className="space-y-2">
          <Label htmlFor="autoTrack">Auto-Track from Transactions</Label>
          <Select name="autoTrack" defaultValue={(goal?.auto_track ?? true).toString()}>
            <SelectTrigger id="autoTrack">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Yes - Update automatically</SelectItem>
              <SelectItem value="false">No - Manual updates only</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Automatically update progress based on transactions in linked category
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={goal?.description || ""}
          placeholder="Add details about your goal..."
          rows={3}
        />
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => history.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : goal ? (
            "Update Goal"
          ) : (
            "Create Goal"
          )}
        </Button>
      </div>
    </Form>
  );
}
