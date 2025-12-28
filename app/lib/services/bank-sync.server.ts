/**
 * Bank Sync Webhook Service
 * Handles webhooks from Casso and SePay payment gateways
 */

import type { D1Database } from "@cloudflare/workers-types";
import { getDb } from "../auth/db.server";
import type { CreateTransactionInput } from "../db/transactions.server";
import { transactionsCrud } from "../db/transactions.server";
import { autoCategorizeTransaction } from "./transaction-categorization.server";

/**
 * Supported webhook providers
 */
export type WebhookProvider = "casso" | "sepay";

/**
 * Bank transaction from webhook
 */
export interface BankTransaction {
  id: string;
  transaction_date: string;
  amount: number;
  content: string;
  code?: string;
  reference_number: string;
  sub_account?: string;
  bank_account?: string;
  bank_name?: string;
  pay_method?: string;
}

/**
 * Casso webhook payload
 */
interface CassoWebhookPayload {
  error: number;
  data: BankTransaction[];
}

/**
 * SePay webhook payload
 */
interface SePayWebhookPayload {
  transaction_id: string;
  transaction_date: string;
  amount: number;
  content: string;
  code: string;
  reference_number: string;
  bank_account: string;
  bank_name: string;
}

/**
 * Webhook event result
 */
interface WebhookResult {
  success: boolean;
  message: string;
  processed: number;
  duplicates: number;
  errors: string[];
}

/**
 * Verify Casso webhook signature
 * Casso uses HMAC SHA256: signature = HMAC(data + timestamp, secret)
 */
export async function verifyCassoSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const computedSignature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

    const computedHash = Array.from(new Uint8Array(computedSignature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return signature === computedHash;
  } catch (error) {
    console.error("Casso signature verification failed:", error);
    return false;
  }
}

/**
 * Verify SePay webhook signature
 * SePay uses HMAC SHA256
 */
export async function verifySePaySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );

    const computedSignature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );

    const computedHash = Array.from(new Uint8Array(computedSignature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return signature === computedHash;
  } catch (error) {
    console.error("SePay signature verification failed:", error);
    return false;
  }
}

/**
 * Parse webhook payload based on provider
 */
export function parseWebhookPayload(
  body: unknown,
  provider: WebhookProvider
): BankTransaction[] {
  if (provider === "casso") {
    const payload = body as CassoWebhookPayload;

    if (payload.error !== 0) {
      throw new Error(`Casso returned error: ${payload.error}`);
    }

    if (!Array.isArray(payload.data)) {
      throw new Error("Invalid Casso payload: data is not an array");
    }

    return payload.data;
  } else if (provider === "sepay") {
    const tx = body as SePayWebhookPayload;

    // SePay sends single transaction per webhook
    return [
      {
        id: tx.transaction_id,
        transaction_date: tx.transaction_date,
        amount: tx.amount,
        content: tx.content,
        code: tx.code,
        reference_number: tx.reference_number,
        bank_account: tx.bank_account,
        bank_name: tx.bank_name,
      },
    ];
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

/**
 * Find existing transaction by reference number
 */
export async function findTransactionByRef(
  db: D1Database,
  referenceNumber: string,
  userId: string
): Promise<CreateTransactionInput | null> {
  const existing = await db
    .prepare(
      `SELECT id FROM transactions
       WHERE reference_number = ? AND user_id = ?
       LIMIT 1`
    )
    .bind(referenceNumber, userId)
    .first<{ id: string }>();

  return existing ? { accountId: "", amount: 0, date: "", description: "" } : null;
}

/**
 * Get user's bank account by provider
 */
async function getUserBankAccount(
  db: D1Database,
  userId: string,
  provider: WebhookProvider,
  bankAccount?: string
): Promise<string | null> {
  // Try to find linked bank account
  const bankAccountRow = await db
    .prepare(
      `SELECT financial_account_id FROM bank_accounts
       WHERE user_id = ? AND provider = ? AND is_active = 1
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .bind(userId, provider)
    .first<{ financial_account_id: string | null }>();

  if (bankAccountRow?.financial_account_id) {
    return bankAccountRow.financial_account_id;
  }

  // Try to find a default financial account
  const defaultAccount = await db
    .prepare(
      `SELECT id FROM financial_accounts
       WHERE user_id = ? AND type IN ('CHECKING', 'SAVINGS') AND is_archived = 0
       ORDER BY created_at ASC
       LIMIT 1`
    )
    .bind(userId)
    .first<{ id: string }>();

  return defaultAccount?.id || null;
}

/**
 * Convert webhook transaction to internal format
 */
async function convertToTransaction(
  webhookTx: BankTransaction,
  userId: string,
  accountId: string
): Promise<CreateTransactionInput> {
  // Parse date (format: YYYY-MM-DD)
  const date = webhookTx.transaction_date;

  // Parse amount (Vietnamese format uses positive for incoming, negative for outgoing)
  // In finance-hub, expenses are negative, income is positive
  let amount = webhookTx.amount;

  // Check content for expense indicators
  const contentLower = webhookTx.content.toLowerCase();
  const isExpense = /chi|xuat|out|payment|thanhtoan|trả|được/i.test(contentLower);

  if (isExpense && amount > 0) {
    amount = -amount;
  }

  // Extract merchant name from content
  const merchantName = extractMerchantName(webhookTx.content);

  return {
    accountId,
    date,
    amount,
    description: webhookTx.content.substring(0, 500), // Limit description length
    merchantName: merchantName || null,
    status: "POSTED",
    referenceNumber: webhookTx.reference_number,
  };
}

/**
 * Extract merchant name from transaction content
 */
function extractMerchantName(content: string): string | null {
  // Common patterns: "Transfer from MERCHANT", "Payment to MERCHANT"
  const patterns = [
    /from\s+(.+?)(?:\s+\d|$)/i,
    /to\s+(.+?)(?:\s+\d|$)/i,
    /tại\s+(.+?)(?:\s+\d|$)/i,
    /t\.(.+?)(?:\s+\d|$)/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 100);
    }
  }

  return null;
}

/**
 * Create webhook event record
 */
async function createWebhookEvent(
  db: D1Database,
  userId: string,
  provider: WebhookProvider,
  payload: string,
  signature: string | null,
  status: string = "pending"
): Promise<string> {
  const eventId = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO webhook_events (id, user_id, provider, event_type, payload, signature, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      eventId,
      userId,
      provider,
      "transaction",
      payload,
      signature || null,
      status
    )
    .run();

  return eventId;
}

/**
 * Update webhook event record
 */
async function updateWebhookEvent(
  db: D1Database,
  eventId: string,
  updates: {
    status?: string;
    transactions_created?: number;
    error_message?: string;
    processing_time_ms?: number;
  }
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.status) {
    fields.push("status = ?");
    values.push(updates.status);
  }

  if (updates.transactions_created !== undefined) {
    fields.push("transactions_created = ?");
    values.push(updates.transactions_created);
  }

  if (updates.error_message) {
    fields.push("error_message = ?");
    values.push(updates.error_message);
  }

  if (updates.processing_time_ms !== undefined) {
    fields.push("processing_time_ms = ?");
    values.push(updates.processing_time_ms);
  }

  if (fields.length > 0) {
    fields.push("processed_at = CURRENT_TIMESTAMP");
    values.push(eventId);

    await db
      .prepare(`UPDATE webhook_events SET ${fields.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
  }
}

/**
 * Update webhook event status with error message
 */
async function updateWebhookEventStatus(
  db: D1Database,
  eventId: string,
  status: string,
  errorMessage: string
): Promise<void> {
  await updateWebhookEvent(db, eventId, {
    status,
    error_message: errorMessage,
  });
}

/**
 * Get bank sync configuration for user and provider
 */
async function getBankSyncConfig(
  db: D1Database,
  userId: string,
  provider: WebhookProvider
): Promise<{ webhook_secret: string } | null> {
  const config = await db
    .prepare(
      `SELECT webhook_secret FROM bank_sync_configs
       WHERE user_id = ? AND provider = ? AND is_enabled = 1
       LIMIT 1`
    )
    .bind(userId, provider)
    .first<{ webhook_secret: string }>();

  return config;
}

/**
 * Identify user from bank sync configuration
 * Returns the user ID and webhook secret for the given provider
 */
async function identifyUserFromBankSyncConfig(
  db: D1Database,
  provider: WebhookProvider
): Promise<{ userId: string; webhookSecret: string } | null> {
  const config = await db
    .prepare(
      `SELECT u.id as user_id, bsc.webhook_secret
       FROM users u
       INNER JOIN bank_sync_configs bsc ON bsc.user_id = u.id
       WHERE bsc.provider = ? AND bsc.is_enabled = 1
       LIMIT 1`
    )
    .bind(provider)
    .first<{ user_id: string; webhook_secret: string }>();

  if (!config) {
    return null;
  }

  return {
    userId: config.user_id,
    webhookSecret: config.webhook_secret,
  };
}

/**
 * Handle incoming webhook
 */
export async function handleWebhook(
  request: Request,
  provider: WebhookProvider
): Promise<WebhookResult> {
  const startTime = Date.now();
  const db = getDb(request);

  // Get request body
  const payload = await request.text();

  // Get signature from headers
  const signature =
    provider === "casso"
      ? request.headers.get("X-Casso-Signature")
      : request.headers.get("SePay-Signature");

  try {
    // Identify user and get webhook secret from bank sync configuration
    const userConfig = await identifyUserFromBankSyncConfig(db, provider);

    if (!userConfig || !userConfig.webhookSecret) {
      return {
        success: false,
        message: "Webhook not configured",
        processed: 0,
        duplicates: 0,
        errors: ["Missing webhook configuration"],
      };
    }

    const { userId, webhookSecret } = userConfig;

    // Verify signature
    const isValid =
      provider === "casso"
        ? await verifyCassoSignature(payload, signature || "", webhookSecret)
        : await verifySePaySignature(payload, signature || "", webhookSecret);

    if (!isValid) {
      // Create webhook event record for failed signature verification
      const failedEventId = await createWebhookEvent(
        db,
        userId,
        provider,
        payload,
        signature || null,
        "failed"
      );

      await updateWebhookEvent(db, failedEventId, {
        status: "failed",
        error_message: "Invalid signature",
        processing_time_ms: Date.now() - startTime,
      });

      return {
        success: false,
        message: "Invalid signature",
        processed: 0,
        duplicates: 0,
        errors: ["Signature verification failed"],
      };
    }

    // Parse payload
    const body = JSON.parse(payload);
    const transactions = parseWebhookPayload(body, provider);

    // Create webhook event record
    const eventId = await createWebhookEvent(
      db,
      userId,
      provider,
      payload,
      signature || null
    );

    // Get or create user's financial account
    const accountId = await getUserBankAccount(db, userId, provider);

    if (!accountId) {
      throw new Error("No financial account found for user");
    }

    // Process transactions
    let processed = 0;
    let duplicates = 0;
    const errors: string[] = [];

    for (const webhookTx of transactions) {
      try {
        // Check for duplicates
        const existing = await findTransactionByRef(
          db,
          webhookTx.reference_number,
          userId
        );

        if (existing) {
          duplicates++;
          continue;
        }

        // Convert to internal format
        const txInput = await convertToTransaction(
          webhookTx,
          userId,
          accountId
        );

        // Create transaction
        await transactionsCrud.createTransaction(db, userId, txInput);

        // Auto-categorize
        await autoCategorizeTransaction(
          db,
          userId,
          webhookTx.content,
          webhookTx.amount
        );

        processed++;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        errors.push(`${webhookTx.id}: ${message}`);
      }
    }

    // Update webhook event
    await updateWebhookEvent(db, eventId, {
      status: errors.length === 0 ? "success" : "failed",
      transactions_created: processed,
      error_message: errors.length > 0 ? errors.join("; ") : undefined,
      processing_time_ms: Date.now() - startTime,
    });

    return {
      success: true,
      message: `Processed ${processed} transactions, ${duplicates} duplicates`,
      processed,
      duplicates,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook processing failed:", error);

    return {
      success: false,
      message,
      processed: 0,
      duplicates: 0,
      errors: [message],
    };
  }
}

/**
 * Get webhook history for user
 */
export async function getWebhookHistory(
  db: D1Database,
  userId: string,
  limit: number = 50
): Promise<
  Array<{
    id: string;
    provider: string;
    status: string;
    transactionsCreated: number;
    errorMessage: string | null;
    receivedAt: string;
    processedAt: string | null;
  }>
> {
  type WebhookEventRow = {
    id: string;
    provider: string;
    status: string;
    transactionsCreated: number;
    errorMessage: string | null;
    receivedAt: string;
    processedAt: string | null;
  };
  const result = await db
    .prepare(
      `SELECT
        id,
        provider,
        status,
        transactions_created as transactionsCreated,
        error_message as errorMessage,
        received_at as receivedAt,
        processed_at as processedAt
       FROM webhook_events
       WHERE user_id = ?
       ORDER BY received_at DESC
       LIMIT ?`
    )
    .bind(userId, limit)
    .all();

  return (result.results as WebhookEventRow[]) || [];
}

/**
 * Get bank sync configuration for user
 */
export async function getBankSyncConfigs(
  db: D1Database,
  userId: string
): Promise<
  Array<{
    id: string;
    provider: string;
    isEnabled: boolean;
    lastSyncAt: string | null;
    syncStatus: string;
    lastError: string | null;
  }>
> {
  type BankSyncConfigRow = {
    id: string;
    provider: string;
    isEnabled: boolean;
    lastSyncAt: string | null;
    syncStatus: string;
    lastError: string | null;
  };
  const result = await db
    .prepare(
      `SELECT
        id,
        provider,
        is_enabled as isEnabled,
        last_sync_at as lastSyncAt,
        sync_status as syncStatus,
        last_error as lastError
       FROM bank_sync_configs
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .bind(userId)
    .all();

  return (result.results as BankSyncConfigRow[]) || [];
}

/**
 * Save bank sync configuration
 */
export async function saveBankSyncConfig(
  db: D1Database,
  userId: string,
  provider: WebhookProvider,
  config: {
    apiKey?: string;
    webhookSecret?: string;
    webhookUrl?: string;
    isEnabled?: boolean;
  }
): Promise<void> {
  const existing = await db
    .prepare(
      `SELECT id FROM bank_sync_configs
       WHERE user_id = ? AND provider = ?
       LIMIT 1`
    )
    .bind(userId, provider)
    .first<{ id: string }>();

  if (existing) {
    // Update existing
    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];

    if (config.apiKey !== undefined) {
      updates.push("api_key = ?");
      values.push(config.apiKey);
    }

    if (config.webhookSecret !== undefined) {
      updates.push("webhook_secret = ?");
      values.push(config.webhookSecret);
    }

    if (config.webhookUrl !== undefined) {
      updates.push("webhook_url = ?");
      values.push(config.webhookUrl);
    }

    if (config.isEnabled !== undefined) {
      updates.push("is_enabled = ?");
      values.push(config.isEnabled ? 1 : 0);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(existing.id, userId, provider);

    await db
      .prepare(`UPDATE bank_sync_configs SET ${updates.join(", ")} WHERE id = ? AND user_id = ? AND provider = ?`)
      .bind(...values)
      .run();
  } else {
    // Create new
    const configId = crypto.randomUUID();

    await db
      .prepare(
        `INSERT INTO bank_sync_configs (id, user_id, provider, api_key, webhook_secret, webhook_url, is_enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        configId,
        userId,
        provider,
        config.apiKey || null,
        config.webhookSecret || null,
        config.webhookUrl || null,
        config.isEnabled !== undefined ? (config.isEnabled ? 1 : 0) : 1
      )
      .run();
  }
}
