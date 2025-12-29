/**
 * Investments Service
 *
 * Handles investment accounts, holdings, transactions, and performance tracking
 */

import type { D1Database } from "@cloudflare/workers-types";

// ============================================================================
// Types
// ============================================================================

export type InvestmentAccountType =
  | "brokerage"
  | "retirement"
  | "ira"
  | "401k"
  | "roth_ira"
  | "custodial"
  | "trust"
  | "crypto"
  | "other";

export type AssetType =
  | "stock"
  | "etf"
  | "mutual_fund"
  | "bond"
  | "crypto"
  | "option"
  | "future"
  | "index"
  | "commodity"
  | "forex"
  | "other";

export type InvestmentTransactionType =
  | "buy"
  | "sell"
  | "dividend"
  | "interest"
  | "deposit"
  | "withdrawal"
  | "split"
  | "transfer_in"
  | "transfer_out"
  | "reinvest_dividend"
  | "fee"
  | "tax"
  | "other";

export interface InvestmentAccount {
  id: string;
  userId: string;
  name: string;
  institution: string | null;
  accountType: InvestmentAccountType;
  currency: string;
  isActive: boolean;
  balance: number;
  totalCostBasis: number;
  totalValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface InvestmentHolding {
  id: string;
  accountId: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  quantity: number;
  avgCostBasis: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  gainLoss: number;
  gainLossPercent: number;
  currency: string;
  exchange: string;
  country: string;
  isActive: boolean;
  firstPurchaseDate: string | null;
  lastUpdate: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface InvestmentTransaction {
  id: string;
  accountId: string;
  holdingId: string | null;
  transactionType: InvestmentTransactionType;
  symbol: string | null;
  quantity: number;
  price: number;
  totalAmount: number;
  commission: number;
  fees: number;
  currency: string;
  transactionDate: string;
  settlementDate: string | null;
  notes: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface InvestmentSnapshot {
  id: string;
  accountId: string;
  snapshotDate: string;
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  cashBalance: number;
  holdingsCount: number;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface InvestmentWatchlist {
  id: string;
  userId: string;
  symbol: string;
  name: string | null;
  assetType: AssetType | null;
  targetPrice: number | null;
  notes: string | null;
  alertEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  dayChange: number;
  dayChangePercent: number;
  cashBalance: number;
  accountsCount: number;
  holdingsCount: number;
  topHoldings: Array<{
    symbol: string;
    name: string;
    value: number;
    weight: number;
  }>;
  assetAllocation: Record<AssetType, number>;
}

export interface CreateInvestmentAccountInput {
  userId: string;
  name: string;
  institution?: string;
  accountType: InvestmentAccountType;
  currency?: string;
  initialBalance?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateHoldingInput {
  accountId: string;
  symbol: string;
  name: string;
  assetType: AssetType;
  quantity: number;
  avgCostBasis: number;
  currentPrice?: number;
  currency?: string;
  exchange?: string;
  country?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateTransactionInput {
  accountId: string;
  holdingId?: string;
  transactionType: InvestmentTransactionType;
  symbol?: string;
  quantity?: number;
  price?: number;
  totalAmount: number;
  commission?: number;
  fees?: number;
  currency?: string;
  transactionDate: string;
  settlementDate?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Investment Accounts
// ============================================================================

/**
 * Get all investment accounts for a user
 */
export async function getInvestmentAccounts(
  db: D1Database,
  userId: string,
  options: { includeInactive?: boolean } = {}
): Promise<InvestmentAccount[]> {
  const { includeInactive = false } = options;

  const result = await db
    .prepare(
      `SELECT * FROM investment_accounts
       WHERE user_id = ?${includeInactive ? "" : " AND is_active = 1"}
       ORDER BY name`
    )
    .bind(userId)
    .all();

  return (result.results || []).map(mapRowToInvestmentAccount);
}

/**
 * Get investment account by ID
 */
export async function getInvestmentAccountById(
  db: D1Database,
  accountId: string,
  userId: string
): Promise<InvestmentAccount | null> {
  const result = await db
    .prepare(`SELECT * FROM investment_accounts WHERE id = ? AND user_id = ?`)
    .bind(accountId, userId)
    .first();

  return result ? mapRowToInvestmentAccount(result) : null;
}

/**
 * Create investment account
 */
export async function createInvestmentAccount(
  db: D1Database,
  input: CreateInvestmentAccountInput
): Promise<InvestmentAccount> {
  const id = crypto.randomUUID();
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  await db
    .prepare(
      `INSERT INTO investment_accounts (
        id, user_id, name, institution, account_type, currency,
        balance, total_cost_basis, total_value, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.userId,
      input.name,
      input.institution || null,
      input.accountType,
      input.currency || "VND",
      input.initialBalance || 0,
      input.initialBalance || 0,
      input.initialBalance || 0,
      metadataJson
    )
    .run();

  return getInvestmentAccountById(db, id, input.userId) as Promise<InvestmentAccount>;
}

/**
 * Update investment account
 */
export async function updateInvestmentAccount(
  db: D1Database,
  accountId: string,
  userId: string,
  updates: Partial<Omit<InvestmentAccount, "id" | "userId" | "createdAt" | "updatedAt">>
): Promise<InvestmentAccount | null> {
  const fields: string[] = [];
  const params: Array<string | number | boolean | null> = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    params.push(updates.name);
  }
  if (updates.institution !== undefined) {
    fields.push("institution = ?");
    params.push(updates.institution);
  }
  if (updates.accountType !== undefined) {
    fields.push("account_type = ?");
    params.push(updates.accountType);
  }
  if (updates.isActive !== undefined) {
    fields.push("is_active = ?");
    params.push(updates.isActive ? 1 : 0);
  }
  if (updates.totalValue !== undefined) {
    fields.push("total_value = ?");
    params.push(updates.totalValue);
  }
  if (updates.totalCostBasis !== undefined) {
    fields.push("total_cost_basis = ?");
    params.push(updates.totalCostBasis);
  }
  if (updates.totalGainLoss !== undefined) {
    fields.push("total_gain_loss = ?");
    params.push(updates.totalGainLoss);
  }
  if (updates.totalGainLossPercent !== undefined) {
    fields.push("total_gain_loss_percent = ?");
    params.push(updates.totalGainLossPercent);
  }
  if (updates.metadata !== undefined) {
    fields.push("metadata = ?");
    params.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
  }

  if (fields.length === 0) {
    return getInvestmentAccountById(db, accountId, userId);
  }

  fields.push("updated_at = datetime('now')");
  params.push(accountId, userId);

  await db
    .prepare(`UPDATE investment_accounts SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`)
    .bind(...params)
    .run();

  return getInvestmentAccountById(db, accountId, userId);
}

/**
 * Delete investment account
 */
export async function deleteInvestmentAccount(
  db: D1Database,
  accountId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM investment_accounts WHERE id = ? AND user_id = ?`)
    .bind(accountId, userId)
    .run();

  return (result.meta.changes || 0) > 0;
}

// ============================================================================
// Investment Holdings
// ============================================================================

/**
 * Get all holdings for an account
 */
export async function getInvestmentHoldings(
  db: D1Database,
  accountId: string,
  userId: string,
  options: { includeInactive?: boolean } = {}
): Promise<InvestmentHolding[]> {
  const { includeInactive = false } = options;

  const result = await db
    .prepare(
      `SELECT ih.* FROM investment_holdings ih
       INNER JOIN investment_accounts ia ON ih.account_id = ia.id
       WHERE ih.account_id = ? AND ia.user_id = ?${includeInactive ? "" : " AND ih.is_active = 1"}
       ORDER BY ih.current_value DESC`
    )
    .bind(accountId, userId)
    .all();

  return (result.results || []).map(mapRowToInvestmentHolding);
}

/**
 * Get holding by ID
 */
export async function getInvestmentHoldingById(
  db: D1Database,
  holdingId: string,
  userId: string
): Promise<InvestmentHolding | null> {
  const result = await db
    .prepare(
      `SELECT ih.* FROM investment_holdings ih
       INNER JOIN investment_accounts ia ON ih.account_id = ia.id
       WHERE ih.id = ? AND ia.user_id = ?`
    )
    .bind(holdingId, userId)
    .first();

  return result ? mapRowToInvestmentHolding(result) : null;
}

/**
 * Create holding
 */
export async function createInvestmentHolding(
  db: D1Database,
  input: CreateHoldingInput
): Promise<InvestmentHolding> {
  const id = crypto.randomUUID();
  const currentValue = input.quantity * (input.currentPrice || input.avgCostBasis);
  const costBasis = input.quantity * input.avgCostBasis;
  const gainLoss = currentValue - costBasis;
  const gainLossPercent = costBasis > 0 ? (gainLoss / costBasis) * 100 : 0;
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  await db
    .prepare(
      `INSERT INTO investment_holdings (
        id, account_id, symbol, name, asset_type, quantity, avg_cost_basis,
        current_price, current_value, cost_basis, gain_loss, gain_loss_percent,
        currency, exchange, country, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.accountId,
      input.symbol,
      input.name,
      input.assetType,
      input.quantity,
      input.avgCostBasis,
      input.currentPrice || input.avgCostBasis,
      currentValue,
      costBasis,
      gainLoss,
      gainLossPercent,
      input.currency || "USD",
      input.exchange || "US",
      input.country || "US",
      metadataJson
    )
    .run();

  return getInvestmentHoldingById(db, id, "") as Promise<InvestmentHolding>;
}

/**
 * Update holding
 */
export async function updateInvestmentHolding(
  db: D1Database,
  holdingId: string,
  userId: string,
  updates: Partial<Omit<InvestmentHolding, "id" | "accountId" | "createdAt" | "updatedAt">>
): Promise<InvestmentHolding | null> {
  const fields: string[] = [];
  const params: Array<string | number | boolean | null> = [];

  if (updates.quantity !== undefined) {
    fields.push("quantity = ?");
    params.push(updates.quantity);
  }
  if (updates.currentPrice !== undefined) {
    fields.push("current_price = ?");
    params.push(updates.currentPrice);
  }
  if (updates.currentPrice !== undefined || updates.quantity !== undefined) {
    // Recalculate derived values
    const holding = await getInvestmentHoldingById(db, holdingId, userId);
    if (holding) {
      const quantity = updates.quantity ?? holding.quantity;
      const currentPrice = updates.currentPrice ?? holding.currentPrice;
      const currentValue = quantity * currentPrice;
      fields.push("current_value = ?");
      params.push(currentValue);

      const gainLoss = currentValue - holding.costBasis;
      fields.push("gain_loss = ?");
      params.push(gainLoss);

      const gainLossPercent = holding.costBasis > 0 ? (gainLoss / holding.costBasis) * 100 : 0;
      fields.push("gain_loss_percent = ?");
      params.push(gainLossPercent);
    }
  }
  if (updates.isActive !== undefined) {
    fields.push("is_active = ?");
    params.push(updates.isActive ? 1 : 0);
  }
  if (updates.metadata !== undefined) {
    fields.push("metadata = ?");
    params.push(updates.metadata ? JSON.stringify(updates.metadata) : null);
  }

  if (fields.length === 0) {
    return getInvestmentHoldingById(db, holdingId, userId);
  }

  fields.push("updated_at = datetime('now')");
  params.push(holdingId);

  await db
    .prepare(
      `UPDATE investment_holdings
       SET ${fields.join(", ")}
       WHERE id = ?`
    )
    .bind(...params)
    .run();

  return getInvestmentHoldingById(db, holdingId, userId);
}

/**
 * Delete holding
 */
export async function deleteInvestmentHolding(
  db: D1Database,
  holdingId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `DELETE FROM investment_holdings
       WHERE id = ? AND account_id IN (
         SELECT id FROM investment_accounts WHERE user_id = ?
       )`
    )
    .bind(holdingId, userId)
    .run();

  return (result.meta.changes || 0) > 0;
}

// ============================================================================
// Investment Transactions
// ============================================================================

/**
 * Get transactions for an account
 */
export async function getInvestmentTransactions(
  db: D1Database,
  accountId: string,
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ transactions: InvestmentTransaction[]; total: number }> {
  const { limit = 50, offset = 0 } = options;

  const [countResult, results] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) as count FROM investment_transactions it
         INNER JOIN investment_accounts ia ON it.account_id = ia.id
         WHERE it.account_id = ? AND ia.user_id = ?`
      )
      .bind(accountId, userId)
      .first(),
    db
      .prepare(
        `SELECT it.* FROM investment_transactions it
         INNER JOIN investment_accounts ia ON it.account_id = ia.id
         WHERE it.account_id = ? AND ia.user_id = ?
         ORDER BY it.transaction_date DESC
         LIMIT ? OFFSET ?`
      )
      .bind(accountId, userId, limit, offset)
      .all(),
  ]);

  const total = countResult?.count ? Number(countResult.count) : 0;
  const transactions = (results.results || []).map(mapRowToInvestmentTransaction);

  return { transactions, total };
}

/**
 * Create transaction
 */
export async function createInvestmentTransaction(
  db: D1Database,
  input: CreateTransactionInput
): Promise<InvestmentTransaction> {
  const id = crypto.randomUUID();
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  await db
    .prepare(
      `INSERT INTO investment_transactions (
        id, account_id, holding_id, transaction_type, symbol, quantity,
        price, total_amount, commission, fees, currency, transaction_date,
        settlement_date, notes, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.accountId,
      input.holdingId || null,
      input.transactionType,
      input.symbol || null,
      input.quantity || 0,
      input.price || 0,
      input.totalAmount,
      input.commission || 0,
      input.fees || 0,
      input.currency || "USD",
      input.transactionDate,
      input.settlementDate || null,
      input.notes || null,
      metadataJson
    )
    .run();

  // Get the created transaction
  const result = await db
    .prepare(`SELECT * FROM investment_transactions WHERE id = ?`)
    .bind(id)
    .first();

  return mapRowToInvestmentTransaction(result!);
}

// ============================================================================
// Portfolio Summary
// ============================================================================

/**
 * Get portfolio summary for a user
 */
export async function getPortfolioSummary(
  db: D1Database,
  userId: string
): Promise<PortfolioSummary> {
  // Get all active accounts
  const accounts = await getInvestmentAccounts(db, userId);

  // Calculate totals
  let totalValue = 0;
  let totalCostBasis = 0;
  let cashBalance = 0;
  let holdingsCount = 0;

  const holdingsBySymbol: Record<string, { name: string; value: number; assetType: AssetType }> = {};
  const assetAllocation: Record<AssetType, number> = {} as any;

  for (const account of accounts) {
    totalValue += account.totalValue;
    totalCostBasis += account.totalCostBasis;
    cashBalance += account.balance;

    const holdings = await getInvestmentHoldings(db, account.id, userId);
    holdingsCount += holdings.length;

    for (const holding of holdings) {
      if (holdingsBySymbol[holding.symbol]) {
        holdingsBySymbol[holding.symbol].value += holding.currentValue;
      } else {
        holdingsBySymbol[holding.symbol] = {
          name: holding.name,
          value: holding.currentValue,
          assetType: holding.assetType,
        };
      }

      assetAllocation[holding.assetType] = (assetAllocation[holding.assetType] || 0) + holding.currentValue;
    }
  }

  const totalGainLoss = totalValue - totalCostBasis;
  const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0;

  // Get day change from latest snapshot
  const latestSnapshot = await db
    .prepare(
      `SELECT day_change, day_change_percent FROM investment_snapshots is_
       INNER JOIN investment_accounts ia ON is_.account_id = ia.id
       WHERE ia.user_id = ?
       ORDER BY is_.snapshot_date DESC
       LIMIT 1`
    )
    .bind(userId)
    .first();

  const dayChange = latestSnapshot?.day_change ? Number(latestSnapshot.day_change) : 0;
  const dayChangePercent = latestSnapshot?.day_change_percent ? Number(latestSnapshot.day_change_percent) : 0;

  // Top holdings
  const topHoldings = Object.entries(holdingsBySymbol)
    .map(([symbol, data]) => ({
      symbol,
      name: data.name,
      value: data.value,
      weight: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  return {
    totalValue,
    totalCostBasis,
    totalGainLoss,
    totalGainLossPercent,
    dayChange,
    dayChangePercent,
    cashBalance,
    accountsCount: accounts.length,
    holdingsCount,
    topHoldings,
    assetAllocation,
  };
}

// ============================================================================
// Helpers
// ============================================================================

function mapRowToInvestmentAccount(row: Record<string, unknown>): InvestmentAccount {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    name: String(row.name),
    institution: row.institution ? String(row.institution) : null,
    accountType: row.account_type as InvestmentAccountType,
    currency: String(row.currency),
    isActive: Boolean(row.is_active),
    balance: Number(row.balance),
    totalCostBasis: Number(row.total_cost_basis),
    totalValue: Number(row.total_value),
    totalGainLoss: Number(row.total_gain_loss),
    totalGainLossPercent: Number(row.total_gain_loss_percent),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : null,
  };
}

function mapRowToInvestmentHolding(row: Record<string, unknown>): InvestmentHolding {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    symbol: String(row.symbol),
    name: String(row.name),
    assetType: row.asset_type as AssetType,
    quantity: Number(row.quantity),
    avgCostBasis: Number(row.avg_cost_basis),
    currentPrice: Number(row.current_price),
    currentValue: Number(row.current_value),
    costBasis: Number(row.cost_basis),
    gainLoss: Number(row.gain_loss),
    gainLossPercent: Number(row.gain_loss_percent),
    currency: String(row.currency),
    exchange: String(row.exchange),
    country: String(row.country),
    isActive: Boolean(row.is_active),
    firstPurchaseDate: row.first_purchase_date ? String(row.first_purchase_date) : null,
    lastUpdate: row.last_update ? String(row.last_update) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : null,
  };
}

function mapRowToInvestmentTransaction(row: Record<string, unknown>): InvestmentTransaction {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    holdingId: row.holding_id ? String(row.holding_id) : null,
    transactionType: row.transaction_type as InvestmentTransactionType,
    symbol: row.symbol ? String(row.symbol) : null,
    quantity: Number(row.quantity),
    price: Number(row.price),
    totalAmount: Number(row.total_amount),
    commission: Number(row.commission),
    fees: Number(row.fees),
    currency: String(row.currency),
    transactionDate: String(row.transaction_date),
    settlementDate: row.settlement_date ? String(row.settlement_date) : null,
    notes: row.notes ? String(row.notes) : null,
    createdAt: String(row.created_at),
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : null,
  };
}
