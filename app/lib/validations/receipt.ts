/**
 * Receipt validation schemas using Zod
 */

import { z } from "zod";

/**
 * Receipt processing status enum
 */
export const ReceiptProcessingStatusEnum = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "needs_review",
]);

export type ReceiptProcessingStatus = z.infer<typeof ReceiptProcessingStatusEnum>;

/**
 * Receipt line item schema
 */
const receiptLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().nonnegative(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  confidence: z.number().min(0).max(1),
});

/**
 * Receipt data schema
 */
export const receiptDataSchema = z.object({
  merchantName: z.string().nullable().optional(),
  date: z.union([z.string(), z.date()]).nullable().optional(),
  totalAmount: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  lineItems: z.array(receiptLineItemSchema).optional(),
  taxAmount: z.number().nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
  rawText: z.string().optional(),
});

/**
 * Upload file validation schema
 */
export const uploadReceiptSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => {
      const validTypes = ["image/jpeg", "image/png", "image/heic"];
      return validTypes.includes(file.type);
    }, "Invalid file type. Only JPEG, PNG, and HEIC are supported.")
    .refine((file) => {
      const maxSize = 5 * 1024 * 1024; // 5MB
      return file.size <= maxSize;
    }, "File size must be less than 5MB."),
});

/**
 * Receipt form schema for creating transaction from receipt
 */
export const receiptFormSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().nullable().optional(),
  date: z.string().min(1, "Date is required"),
  amount: z
    .number({
      required_error: "Amount is required",
      invalid_type_error: "Amount must be a number",
    })
    .refine((val) => Number.isFinite(val), {
      message: "Amount must be a finite number",
    })
    .refine((val) => {
      const decimals = val.toString().split(".")[1]?.length || 0;
      return decimals <= 2;
    }, "Amount can have at most 2 decimal places"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters"),
  merchantName: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  receiptId: z.string().min(1, "Receipt ID is required"),
  createTransaction: z.boolean(),
});

export type ReceiptFormInput = z.infer<typeof receiptFormSchema>;

/**
 * Receipt ID parameter schema
 */
export const receiptIdSchema = z.object({
  id: z.string().min(1, "Receipt ID is required"),
});

/**
 * Receipt filter schema for history
 */
export const receiptFilterSchema = z.object({
  status: ReceiptProcessingStatusEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export type ReceiptFilterInput = z.infer<typeof receiptFilterSchema>;

/**
 * OCR processing options schema
 */
export const ocrOptionsSchema = z.object({
  detectCurrency: z.boolean().default(true),
  defaultCurrency: z.string().default("VND"),
  extractLineItems: z.boolean().default(true),
  locale: z.string().default("en"),
});

export type OcrOptionsInput = z.infer<typeof ocrOptionsSchema>;
