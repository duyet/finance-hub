/**
 * Taxes Service
 *
 * Handles tax lot tracking, capital gains calculations, and tax loss harvesting
 */

import type { D1Database } from "@cloudflare/workers-types";

// ============================================================================
// Types
// ============================================================================

export type TaxEventType =
  | "dividend"
  | "interest"
  | "capital_gain_distribution"
  | "stock_split"
  | "stock_dividend"
  | "return_of_capital"
  | "wash_sale"
  | "other";

export interface TaxLot {
  id: string;
  userId: string;
  holdingId: string;
  symbol: string;
  quantity: number;
  acquisitionDate: string;
  acquisitionPrice: number;
  costBasis: number;
  dispositionDate: string | null;
  dispositionPrice: number | null;
  proceeds: number;
  gainLoss: number;
  holdingPeriodDays: number;
  isClosed: boolean;
  isWashSale: boolean;
  washSaleReplacementLotId: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface CapitalGainsSummary {
  id: string;
  userId: string;
  taxYear: number;
  symbol: string;
  shortTermGainLoss: number;
  longTermGainLoss: number;
  totalGainLoss: number;
  positionsClosed: number;
}

export interface TaxEvent {
  id: string;
  userId: string;
  eventType: TaxEventType;
  symbol: string;
  eventDate: string;
  amount: number;
  description: string | null;
  isReported: boolean;
  taxYear: number | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

export interface TaxLossHarvestingOpportunity {
  id: string;
  userId: string;
  symbol: string;
  unrealizedLoss: number;
  unrealizedLossPercent: number;
  currentValue: number;
  costBasis: number;
  quantity: number;
  holdingPeriodDays: number;
  isHarvestable: boolean;
  reasonNotHarvestable: string | null;
  identifiedDate: string;
  expiresAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface TaxPreference {
  id: string;
  userId: string;
  taxJurisdiction: string;
  defaultTaxYear: number;
  shortTermThresholdDays: number;
  enableWashSaleDetection: boolean;
  washSaleWindowDays: number;
  autoHarvestLosses: boolean;
  harvestThresholdPercent: number;
  minHarvestAmount: number;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface TaxReport {
  taxYear: number;
  shortTermGains: number;
  longTermGains: number;
  totalGains: number;
  dividends: number;
  interest: number;
  capitalGainDistributions: number;
  washSales: number;
  positionsClosed: number;
  symbols: Array<{
    symbol: string;
    shortTermGainLoss: number;
    longTermGainLoss: number;
    totalGainLoss: number;
  }>;
}

export interface CreateTaxLotInput {
  userId: string;
  holdingId: string;
  symbol: string;
  quantity: number;
  acquisitionDate: string;
  acquisitionPrice: number;
  costBasis?: number;
}

export interface CreateTaxEventInput {
  userId: string;
  eventType: TaxEventType;
  symbol: string;
  eventDate: string;
  amount: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Tax Lots
// ============================================================================

/**
 * Get all tax lots for a user
 */
export async function getTaxLots(
  db: D1Database,
  userId: string,
  options: {
    includeClosed?: boolean;
    symbol?: string;
    taxYear?: number;
  } = {}
): Promise<TaxLot[]> {
  const { includeClosed = false, symbol, taxYear } = options;

  const conditions = ["user_id = ?"];
  const params: Array<string | number> = [userId];

  if (!includeClosed) {
    conditions.push("is_closed = 0");
  }

  if (symbol) {
    conditions.push("symbol = ?");
    params.push(symbol);
  }

  if (taxYear) {
    conditions.push(
      `(disposition_date >= ? AND disposition_date <= ?) OR (is_closed = 0)`
    );
    params.push(`${taxYear}-01-01`, `${taxYear}-12-31`);
  }

  const result = await db
    .prepare(`SELECT * FROM tax_lots WHERE ${conditions.join(" AND ")} ORDER BY acquisition_date DESC`)
    .bind(...params)
    .all();

  return (result.results || []).map(mapRowToTaxLot);
}

/**
 * Create tax lot
 */
export async function createTaxLot(
  db: D1Database,
  input: CreateTaxLotInput
): Promise<TaxLot> {
  const id = crypto.randomUUID();
  const costBasis = input.costBasis ?? input.quantity * input.acquisitionPrice;
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  await db
    .prepare(
      `INSERT INTO tax_lots (
        id, user_id, holding_id, symbol, quantity, acquisition_date,
        acquisition_price, cost_basis, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.userId,
      input.holdingId,
      input.symbol,
      input.quantity,
      input.acquisitionDate,
      input.acquisitionPrice,
      costBasis,
      metadataJson
    )
    .run();

  return getTaxLotById(db, id);
}

/**
 * Close tax lot (disposition)
 */
export async function closeTaxLot(
  db: D1Database,
  taxLotId: string,
  userId: string,
  dispositionDate: string,
  dispositionPrice: number,
  quantity: number
): Promise<TaxLot> {
  const lot = await getTaxLotById(db, taxLotId);
  if (!lot || lot.userId !== userId) {
    throw new Error("Tax lot not found");
  }

  const proceeds = quantity * dispositionPrice;
  const proportionSold = quantity / lot.quantity;
  const costBasisSold = lot.costBasis * proportionSold;
  const gainLoss = proceeds - costBasisSold;

  // Calculate holding period
  const acquisition = new Date(lot.acquisitionDate);
  const disposition = new Date(dispositionDate);
  const holdingPeriodDays = Math.floor((disposition.getTime() - acquisition.getTime()) / (1000 * 60 * 60 * 24));

  // Update tax lot
  await db
    .prepare(
      `UPDATE tax_lots
       SET disposition_date = ?,
           disposition_price = ?,
           proceeds = ?,
           gain_loss = ?,
           holding_period_days = ?,
           is_closed = 1,
           updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(dispositionDate, dispositionPrice, proceeds, gainLoss, holdingPeriodDays, taxLotId)
    .run();

  return getTaxLotById(db, taxLotId) as Promise<TaxLot>;
}

/**
 * Get tax lot by ID
 */
async function getTaxLotById(
  db: D1Database,
  taxLotId: string
): Promise<TaxLot | null> {
  const result = await db
    .prepare(`SELECT * FROM tax_lots WHERE id = ?`)
    .bind(taxLotId)
    .first();

  return result ? mapRowToTaxLot(result) : null;
}

// ============================================================================
// Capital Gains Summary
// ============================================================================

/**
 * Get capital gains summary for a tax year
 */
export async function getCapitalGainsSummary(
  db: D1Database,
  userId: string,
  taxYear: number
): Promise<CapitalGainsSummary[]> {
  const result = await db
    .prepare(
      `SELECT * FROM capital_gains_summary
       WHERE user_id = ? AND tax_year = ?
       ORDER BY total_gain_loss DESC`
    )
    .bind(userId, taxYear)
    .all();

  return (result.results || []).map((row) => ({
    id: String(row.id),
    userId: String(row.user_id),
    taxYear: Number(row.tax_year),
    symbol: String(row.symbol),
    shortTermGainLoss: Number(row.short_term_gain_loss),
    longTermGainLoss: Number(row.long_term_gain_loss),
    totalGainLoss: Number(row.total_gain_loss),
    positionsClosed: Number(row.positions_closed),
  }));
}

/**
 * Calculate capital gains summary from tax lots
 */
export async function calculateCapitalGainsSummary(
  db: D1Database,
  userId: string,
  taxYear: number
): Promise<void> {
  const shortTermThreshold = 365; // Default to 1 year for long-term

  // Get closed tax lots for the tax year
  const lots = await getTaxLots(db, userId, {
    includeClosed: true,
    taxYear,
  });

  // Group by symbol
  const bySymbol: Record<string, {
    shortTermGainLoss: number;
    longTermGainLoss: number;
    positionsClosed: number;
  }> = {};

  for (const lot of lots) {
    if (!lot.isClosed) continue;

    if (!bySymbol[lot.symbol]) {
      bySymbol[lot.symbol] = {
        shortTermGainLoss: 0,
        longTermGainLoss: 0,
        positionsClosed: 0,
      };
    }

    const isLongTerm = lot.holdingPeriodDays >= shortTermThreshold;
    if (isLongTerm) {
      bySymbol[lot.symbol].longTermGainLoss += lot.gainLoss;
    } else {
      bySymbol[lot.symbol].shortTermGainLoss += lot.gainLoss;
    }

    bySymbol[lot.symbol].positionsClosed += 1;
  }

  // Update capital gains summary
  for (const [symbol, data] of Object.entries(bySymbol)) {
    const totalGainLoss = data.shortTermGainLoss + data.longTermGainLoss;

    await db
      .prepare(
        `INSERT INTO capital_gains_summary (
          id, user_id, tax_year, symbol,
          short_term_gain_loss, long_term_gain_loss, total_gain_loss,
          positions_closed
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, tax_year, symbol) DO UPDATE SET
          short_term_gain_loss = excluded.short_term_gain_loss,
          long_term_gain_loss = excluded.long_term_gain_loss,
          total_gain_loss = excluded.total_gain_loss,
          positions_closed = excluded.positions_closed,
          updated_at = datetime('now')`
      )
      .bind(
        crypto.randomUUID(),
        userId,
        taxYear,
        symbol,
        data.shortTermGainLoss,
        data.longTermGainLoss,
        totalGainLoss,
        data.positionsClosed
      )
      .run();
  }
}

// ============================================================================
// Tax Events
// ============================================================================

/**
 * Create tax event
 */
export async function createTaxEvent(
  db: D1Database,
  input: CreateTaxEventInput
): Promise<TaxEvent> {
  const id = crypto.randomUUID();
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  await db
    .prepare(
      `INSERT INTO tax_events (
        id, user_id, event_type, symbol, event_date, amount,
        description, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.userId,
      input.eventType,
      input.symbol,
      input.eventDate,
      input.amount,
      input.description || null,
      metadataJson
    )
    .run();

  return getTaxEventById(db, id);
}

/**
 * Get tax events for a user
 */
export async function getTaxEvents(
  db: D1Database,
  userId: string,
  options: { taxYear?: number; eventType?: TaxEventType } = {}
): Promise<TaxEvent[]> {
  const { taxYear, eventType } = options;

  const conditions = ["user_id = ?"];
  const params: Array<string | number> = [userId];

  if (taxYear !== undefined) {
    conditions.push("tax_year = ?");
    params.push(taxYear);
  }

  if (eventType !== undefined) {
    conditions.push("event_type = ?");
    params.push(eventType);
  }

  const result = await db
    .prepare(`SELECT * FROM tax_events WHERE ${conditions.join(" AND ")} ORDER BY event_date DESC`)
    .bind(...params)
    .all();

  return (result.results || []).map(mapRowToTaxEvent);
}

/**
 * Get tax event by ID
 */
async function getTaxEventById(db: D1Database, eventId: string): Promise<TaxEvent> {
  const result = await db
    .prepare(`SELECT * FROM tax_events WHERE id = ?`)
    .bind(eventId)
    .first();

  if (!result) {
    throw new Error(`Tax event not found: ${eventId}`);
  }

  return mapRowToTaxEvent(result);
}

// ============================================================================
// Tax Loss Harvesting
// ============================================================================

/**
 * Identify tax loss harvesting opportunities
 */
export async function identifyTaxLossHarvestingOpportunities(
  db: D1Database,
  userId: string,
  options: { thresholdPercent?: number; minAmount?: number } = {}
): Promise<TaxLossHarvestingOpportunity[]> {
  const { thresholdPercent = 5, minAmount = 1000 } = options;

  // Get open tax lots with unrealized losses
  const lots = await getTaxLots(db, userId, { includeClosed: false });

  const opportunities: TaxLossHarvestingOpportunity[] = [];

  for (const lot of lots) {
    // Calculate unrealized loss
    const currentPrice = lot.acquisitionPrice; // Would fetch from market data in production
    const currentValue = lot.quantity * currentPrice;
    const unrealizedLoss = currentValue - lot.costBasis;
    const unrealizedLossPercent = (unrealizedLoss / lot.costBasis) * 100;

    // Check if it meets threshold
    if (unrealizedLoss < 0 && Math.abs(unrealizedLossPercent) >= thresholdPercent && Math.abs(unrealizedLoss) >= minAmount) {
      const acquisition = new Date(lot.acquisitionDate);
      const now = new Date();
      const holdingPeriodDays = Math.floor((now.getTime() - acquisition.getTime()) / (1000 * 60 * 60 * 24));

      // Calculate wash sale expiration
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + 30); // 30-day window

      opportunities.push({
        id: crypto.randomUUID(),
        userId,
        symbol: lot.symbol,
        unrealizedLoss,
        unrealizedLossPercent,
        currentValue,
        costBasis: lot.costBasis,
        quantity: lot.quantity,
        holdingPeriodDays,
        isHarvestable: true,
        reasonNotHarvestable: null,
        identifiedDate: now.toISOString().split("T")[0],
        expiresAt: expiresAt.toISOString().split("T")[0],
        metadata: null,
      });
    }
  }

  return opportunities;
}

// ============================================================================
// Tax Report Generation
// ============================================================================

/**
 * Generate comprehensive tax report
 */
export async function generateTaxReport(
  db: D1Database,
  userId: string,
  taxYear: number
): Promise<TaxReport> {
  // Calculate capital gains summary first
  await calculateCapitalGainsSummary(db, userId, taxYear);

  // Get capital gains summary
  const gainsSummary = await getCapitalGainsSummary(db, userId, taxYear);

  // Get tax events
  const events = await getTaxEvents(db, userId, { taxYear });

  // Calculate totals
  let shortTermGains = 0;
  let longTermGains = 0;
  let dividends = 0;
  let interest = 0;
  let capitalGainDistributions = 0;
  let washSales = 0;

  for (const summary of gainsSummary) {
    shortTermGains += summary.shortTermGainLoss;
    longTermGains += summary.longTermGainLoss;
  }

  for (const event of events) {
    switch (event.eventType) {
      case "dividend":
        dividends += event.amount;
        break;
      case "interest":
        interest += event.amount;
        break;
      case "capital_gain_distribution":
        capitalGainDistributions += event.amount;
        break;
      case "wash_sale":
        washSales += event.amount;
        break;
    }
  }

  const totalGains = shortTermGains + longTermGains;

  // Build symbols breakdown
  const symbols = gainsSummary.map((s) => ({
    symbol: s.symbol,
    shortTermGainLoss: s.shortTermGainLoss,
    longTermGainLoss: s.longTermGainLoss,
    totalGainLoss: s.totalGainLoss,
  }));

  return {
    taxYear,
    shortTermGains,
    longTermGains,
    totalGains,
    dividends,
    interest,
    capitalGainDistributions,
    washSales,
    positionsClosed: gainsSummary.reduce((sum, s) => sum + s.positionsClosed, 0),
    symbols,
  };
}

// ============================================================================
// Tax Preferences
// ============================================================================

/**
 * Get tax preferences for a user
 */
export async function getTaxPreferences(
  db: D1Database,
  userId: string
): Promise<TaxPreference> {
  const result = await db
    .prepare(`SELECT * FROM tax_preferences WHERE user_id = ?`)
    .bind(userId)
    .first();

  if (!result) {
    // Create default preferences
    return createDefaultTaxPreferences(db, userId);
  }

  return mapRowToTaxPreference(result);
}

async function createDefaultTaxPreferences(
  db: D1Database,
  userId: string
): Promise<TaxPreference> {
  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO tax_preferences (
        id, user_id, tax_jurisdiction, default_tax_year,
        short_term_threshold_days, enable_wash_sale_detection,
        wash_sale_window_days, auto_harvest_losses,
        harvest_threshold_percent, min_harvest_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      userId,
      "US",
      new Date().getFullYear(),
      365,
      1,
      30,
      0,
      5.0,
      1000
    )
    .run();

  return getTaxPreferences(db, userId);
}

// ============================================================================
// Helpers
// ============================================================================

function mapRowToTaxLot(row: Record<string, unknown>): TaxLot {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    holdingId: String(row.holding_id),
    symbol: String(row.symbol),
    quantity: Number(row.quantity),
    acquisitionDate: String(row.acquisition_date),
    acquisitionPrice: Number(row.acquisition_price),
    costBasis: Number(row.cost_basis),
    dispositionDate: row.disposition_date ? String(row.disposition_date) : null,
    dispositionPrice: row.disposition_price ? Number(row.disposition_price) : null,
    proceeds: Number(row.proceeds),
    gainLoss: Number(row.gain_loss),
    holdingPeriodDays: Number(row.holding_period_days),
    isClosed: Boolean(row.is_closed),
    isWashSale: Boolean(row.is_wash_sale),
    washSaleReplacementLotId: row.wash_sale_replacement_lot_id ? String(row.wash_sale_replacement_lot_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : null,
  };
}

function mapRowToTaxEvent(row: Record<string, unknown>): TaxEvent {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    eventType: row.event_type as TaxEventType,
    symbol: String(row.symbol),
    eventDate: String(row.event_date),
    amount: Number(row.amount),
    description: row.description ? String(row.description) : null,
    isReported: Boolean(row.is_reported),
    taxYear: row.tax_year ? Number(row.tax_year) : null,
    createdAt: String(row.created_at),
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : null,
  };
}

function mapRowToTaxPreference(row: Record<string, unknown>): TaxPreference {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    taxJurisdiction: String(row.tax_jurisdiction),
    defaultTaxYear: Number(row.default_tax_year),
    shortTermThresholdDays: Number(row.short_term_threshold_days),
    enableWashSaleDetection: Boolean(row.enable_wash_sale_detection),
    washSaleWindowDays: Number(row.wash_sale_window_days),
    autoHarvestLosses: Boolean(row.auto_harvest_losses),
    harvestThresholdPercent: Number(row.harvest_threshold_percent),
    minHarvestAmount: Number(row.min_harvest_amount),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : null,
  };
}
