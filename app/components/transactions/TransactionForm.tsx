import { useNavigation } from "react-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Form as FormComponent,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Textarea } from "~/components/ui/textarea";
import {
  createTransactionSchema,
  TransactionStatus,
} from "~/lib/validations/transaction";
import type { TransactionFilterOptions, TransactionWithRelations } from "~/lib/db/transactions.server";

/**
 * Transaction form props
 */
interface TransactionFormProps {
  transaction?: TransactionWithRelations;
  filterOptions: TransactionFilterOptions;
  isSubmitting?: boolean;
  onSubmit: (data: z.infer<typeof createTransactionSchema>) => void;
  onCancel: () => void;
}

/**
 * Transaction form component
 * Handles both create and edit modes
 */
export function TransactionForm({
  transaction,
  filterOptions,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const navigation = useNavigation();
  const isPending = navigation.state === "submitting";
  const isEdit = !!transaction;

  const form = useForm<z.infer<typeof createTransactionSchema>>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      accountId: transaction?.account_id || "",
      categoryId: transaction?.category_id || null,
      date: transaction
        ? new Date(transaction.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      amount: transaction?.amount || 0,
      description: transaction?.description || "",
      merchantName: transaction?.merchant_name || "",
      status: transaction?.status || "POSTED",
      referenceNumber: transaction?.reference_number || "",
      receiptUrl: transaction?.receipt_url || "",
      notes: transaction?.notes || "",
    },
  });

  const handleSubmit = (data: z.infer<typeof createTransactionSchema>) => {
    onSubmit(data);
  };

  const incomeCategories = filterOptions.categories.filter(
    (c) => c.type === "INCOME"
  );
  const expenseCategories = filterOptions.categories.filter(
    (c) => c.type === "EXPENSE"
  );

  return (
    <FormComponent {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Date and Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground mt-1">
                  Positive for income, negative for expense
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Account */}
        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filterOptions.accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <div className="flex items-center justify-between w-full gap-2">
                        <span>{account.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {account.type}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category (Optional)</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value || undefined}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {incomeCategories.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-green-600">
                        Income
                      </div>
                      {incomeCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {expenseCategories.length > 0 && (
                    <>
                      {incomeCategories.length > 0 && (
                        <div className="my-1 border-t" />
                      )}
                      <div className="px-2 py-1.5 text-xs font-semibold text-orange-600">
                        Expense
                      </div>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Grocery shopping" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Merchant Name */}
        <FormField
          control={form.control}
          name="merchantName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Merchant (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Walmart, Amazon"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={(value) =>
                  field.onChange(value as TransactionStatus)
                }
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="POSTED">Posted</SelectItem>
                  <SelectItem value="CLEARED">Cleared</SelectItem>
                  <SelectItem value="RECONCILED">Reconciled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Reference Number */}
        <FormField
          control={form.control}
          name="referenceNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reference Number (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Check #1234"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Receipt URL */}
        <FormField
          control={form.control}
          name="receiptUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Receipt URL (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="url"
                  placeholder="https://example.com/receipt.pdf"
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes..."
                  className="resize-none"
                  rows={3}
                  value={field.value || ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending || isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending || isSubmitting}>
            {isPending || isSubmitting
              ? "Saving..."
              : isEdit
              ? "Update Transaction"
              : "Create Transaction"}
          </Button>
        </div>
      </form>
    </FormComponent>
  );
}
