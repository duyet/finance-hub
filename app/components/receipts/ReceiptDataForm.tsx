/**
 * ReceiptDataForm Component
 * Form to review and edit extracted receipt data
 */

import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Textarea } from "~/components/ui/textarea";
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
import { receiptFormSchema } from "~/lib/validations/receipt";
import type { ReceiptData, CategorySuggestion } from "~/lib/types/receipt";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "~/components/ui/badge";

interface ReceiptDataFormProps {
  imageUrl: string;
  extractedData: ReceiptData;
  confidence: number;
  receiptId: string;
  categorySuggestions?: CategorySuggestion[];
  accounts: Array<{ id: string; name: string; type: string }>;
  categories: Array<{ id: string; name: string; type: string }>;
  locale?: string;
}

export function ReceiptDataForm({
  imageUrl,
  extractedData,
  confidence,
  receiptId,
  categorySuggestions = [],
  accounts,
  categories,
  locale = "en",
}: ReceiptDataFormProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    categorySuggestions[0]?.categoryId || null
  );

  const navigation = useNavigation();
  const isPending = navigation.state === "submitting";

  const form = useForm<z.infer<typeof receiptFormSchema>>({
    resolver: zodResolver(receiptFormSchema),
    defaultValues: {
      accountId: accounts[0]?.id || "",
      categoryId: selectedCategory,
      date: extractedData.date
        ? new Date(extractedData.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      amount: extractedData.totalAmount || 0,
      description: extractedData.merchantName || "Receipt purchase",
      merchantName: extractedData.merchantName || "",
      notes: "",
      receiptId,
      createTransaction: true,
    },
  });

  const handleSubmit: (data: z.infer<typeof receiptFormSchema>) => Promise<void> = async (data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === "createTransaction") {
        formData.append(key, value ? "true" : "false");
      } else {
        formData.append(key, value === null ? "" : String(value));
      }
    });

    await fetch("/action/create-transaction-from-receipt", {
      method: "POST",
      body: formData,
    }).then((res) => res.json());
  };

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Image Preview */}
      <div className="space-y-4">
        <div className="rounded-lg overflow-hidden border">
          <img src={imageUrl} alt="Receipt" className="w-full" />
        </div>

        {/* Confidence Indicator */}
        <div
          className={`flex items-center gap-2 p-3 rounded-lg ${
            confidence >= 0.7
              ? "bg-green-50 dark:bg-green-950/20"
              : confidence >= 0.4
              ? "bg-yellow-50 dark:bg-yellow-950/20"
              : "bg-red-50 dark:bg-red-950/20"
          }`}
        >
          {confidence >= 0.7 ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          )}

          <div className="flex-1">
            <p className="text-sm font-medium">
              {confidence >= 0.7
                ? "High confidence"
                : confidence >= 0.4
                ? "Moderate confidence - please review"
                : "Low confidence - manual review required"}
            </p>
            <p className="text-xs text-muted-foreground">
              Accuracy: {(confidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <FormComponent {...form}>
        <Form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Merchant Name */}
          <FormField
            control={form.control}
            name="merchantName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Merchant Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ""}
                    placeholder="e.g., Walmart, Amazon"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date and Amount */}
          <div className="grid grid-cols-2 gap-4">
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
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseFloat(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Transaction description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Account */}
          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Account</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
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
                <FormLabel>Category</FormLabel>

                {categorySuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {categorySuggestions.map((suggestion) => (
                      <Badge
                        key={suggestion.categoryId}
                        variant={
                          selectedCategory === suggestion.categoryId
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedCategory(suggestion.categoryId);
                          field.onChange(suggestion.categoryId);
                        }}
                      >
                        {suggestion.categoryName}
                        <span className="ml-1 text-xs opacity-70">
                          ({(suggestion.confidence * 100).toFixed(0)}%)
                        </span>
                      </Badge>
                    ))}
                  </div>
                )}

                <Select
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    field.onChange(value);
                  }}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    {...field}
                    value={field.value || ""}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Hidden receiptId and createTransaction */}
          <input type="hidden" {...form.register("receiptId")} />
          <input type="hidden" {...form.register("createTransaction")} />

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating Transaction..." : "Create Transaction"}
          </Button>
        </Form>
      </FormComponent>
    </div>
  );
}
