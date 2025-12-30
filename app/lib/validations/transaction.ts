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
 * Transaction ID parameter schema
 */
export const transactionIdSchema = z.object({
  id: z.string().min(1, "Transaction ID is required"),
});

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
