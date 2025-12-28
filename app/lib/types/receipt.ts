/**
 * Receipt data types and interfaces
 */

/**
 * Line item extracted from receipt
 */
export interface ReceiptLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  confidence: number;
}

/**
 * Extracted receipt data from OCR processing
 */
export interface ReceiptData {
  merchantName?: string | null;
  date?: Date | string | null;
  totalAmount?: number | null;
  currency?: string | null;
  lineItems?: ReceiptLineItem[];
  taxAmount?: number | null;
  confidence?: number;
  rawText?: string;
  /** OCR model used for extraction (e.g., "gemma-3", "llama-3.2") */
  modelUsed?: string;
}

/**
 * Receipt upload response
 */
export interface ReceiptUploadResponse {
  receiptId: string;
  imageUrl: string;
  expiresAt: Date;
}

/**
 * Receipt processing status
 */
export type ReceiptProcessingStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "needs_review";

/**
 * Receipt record from database
 */
export interface ReceiptRecord {
  id: string;
  userId: string;
  imageUrl: string;
  thumbnailUrl?: string;
  status: ReceiptProcessingStatus;
  extractedData: ReceiptData;
  confidence: number;
  errorMessage?: string;
  transactionId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date | null;
}

/**
 * Receipt with transaction relation
 */
export interface ReceiptWithTransaction extends ReceiptRecord {
  transaction?: {
    id: string;
    date: Date;
    description: string;
    amount: number;
    categoryName?: string;
  };
}

/**
 * Category suggestion result
 */
export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reason?: string;
}

/**
 * OCR processing options
 */
export interface OcrProcessingOptions {
  detectCurrency?: boolean;
  defaultCurrency?: string;
  extractLineItems?: boolean;
  locale?: string;
}

/**
 * Parsed receipt form data for transaction creation
 */
export interface ReceiptFormData {
  accountId: string;
  categoryId?: string | null;
  date: string;
  amount: number;
  description: string;
  merchantName?: string | null;
  notes?: string | null;
  receiptId: string;
  createTransaction: boolean;
}
