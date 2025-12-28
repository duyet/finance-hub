import { z } from "zod";

/**
 * Transaction status enum
 */
export const TransactionStatusEnum = z.enum([
  "PENDING",
  "POSTED",
  "CLEARED",
  "RECONCILED",
]);

export type TransactionStatus = z.infer<typeof TransactionStatusEnum>;

/**
 * Transaction type enum for filtering
 */
export const TransactionTypeEnum = z.enum(["INCOME", "EXPENSE", "ALL"]);

export type TransactionType = z.infer<typeof TransactionTypeEnum>;

/**
 * Transaction filter schema
 */
export const transactionFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountIds: z.array(z.string()).optional(),
  categoryIds: z.array(z.string()).optional(),
  type: TransactionTypeEnum.optional(),
  status: TransactionStatusEnum.optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;

/**
 * Base transaction schema with common fields
 */
const baseTransactionSchema = {
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().nullable().optional(),
  date: z.string().min(1, "Date is required"),
  amount: z.number({
    required_error: "Amount is required",
    invalid_type_error: "Amount must be a number",
  }),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  merchantName: z.string().max(200).nullable().optional(),
  status: TransactionStatusEnum.optional(),
  referenceNumber: z.string().max(100).nullable().optional(),
  receiptUrl: z.string().url().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
};

/**
 * Create transaction schema
 */
export const createTransactionSchema = z.object({
  ...baseTransactionSchema,
  // Ensure amount has at most 2 decimal places
  amount: z
    .number()
    .refine((val) => Number.isFinite(val), {
      message: "Amount must be a finite number",
    })
    .refine((val) => {
      const decimals = val.toString().split(".")[1]?.length || 0;
      return decimals <= 2;
    }, "Amount can have at most 2 decimal places"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

/**
 * Update transaction schema (all fields optional)
 */
export const updateTransactionSchema = z.object({
  accountId: z.string().min(1).optional(),
  categoryId: z.string().nullable().optional(),
  date: z.string().min(1).optional(),
  amount: z
    .number()
    .finite()
    .refine((val) => {
      const decimals = val.toString().split(".")[1]?.length || 0;
      return decimals <= 2;
    }, "Amount can have at most 2 decimal places")
    .optional(),
  description: z
    .string()
    .min(1)
    .max(500)
    .optional(),
  merchantName: z.string().max(200).nullable().optional(),
  status: TransactionStatusEnum.optional(),
  referenceNumber: z.string().max(100).nullable().optional(),
  receiptUrl: z.string().url().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

/**
 * Bulk update category schema
 */
export const bulkUpdateCategorySchema = z.object({
  transactionIds: z
    .array(z.string())
    .min(1, "At least one transaction must be selected"),
  categoryId: z.string().nullable(),
});

export type BulkUpdateCategoryInput = z.infer<typeof bulkUpdateCategorySchema>;

/**
 * Bulk delete schema
 */
export const bulkDeleteSchema = z.object({
  transactionIds: z
    .array(z.string())
    .min(1, "At least one transaction must be selected"),
});

export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;

/**
 * Transaction ID parameter schema
 */
export const transactionIdSchema = z.object({
  id: z.string().min(1, "Transaction ID is required"),
});

/**
 * Query parameter schemas for URL parsing
 */
export const transactionQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  accountIds: z.string().optional(), // Comma-separated
  categoryIds: z.string().optional(), // Comma-separated
  type: TransactionTypeEnum.optional(),
  status: TransactionStatusEnum.optional(),
  search: z.string().optional(),
});

export type TransactionQueryInput = z.infer<typeof transactionQuerySchema>;

/**
 * Helper function to parse transaction filters from URL search params
 */
export function parseTransactionFilters(
  searchParams: URLSearchParams
): TransactionFilterInput {
  const params = Object.fromEntries(searchParams.entries());

  // Handle comma-separated arrays - remove from params before parsing
  const { accountIds: accountIdsStr, categoryIds: categoryIdsStr, page, pageSize, ...restParams } = params;

  const accountIds = accountIdsStr ? accountIdsStr.split(",").filter(Boolean) : undefined;
  const categoryIds = categoryIdsStr ? categoryIdsStr.split(",").filter(Boolean) : undefined;

  return transactionFilterSchema.parse({
    ...restParams,
    accountIds,
    categoryIds,
    page: page ? parseInt(page, 10) : 1,
    pageSize: pageSize ? parseInt(pageSize, 10) : 50,
  });
}

/**
 * Helper function to build URL search params from filters
 */
export function buildTransactionSearchParams(
  filters: Partial<TransactionFilterInput>
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.page) params.set("page", filters.page.toString());
  if (filters.pageSize) params.set("pageSize", filters.pageSize.toString());
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.accountIds?.length)
    params.set("accountIds", filters.accountIds.join(","));
  if (filters.categoryIds?.length)
    params.set("categoryIds", filters.categoryIds.join(","));
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);

  return params;
}
