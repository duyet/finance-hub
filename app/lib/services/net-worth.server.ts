/**
 * Net Worth Service
 *
 * Calculates and tracks net worth over time with historical snapshots
 */

import type { D1Database } from "@cloudflare/workers-types";

// ============================================================================
// Types
// ============================================================================

export interface NetWorthSnapshot {
  id: string;
  userId: string;
  snapshotDate: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  cash: number;
  investments: number;
  property: number;
  otherAssets: number;
  creditCardDebt: number;
  loans: number;
  mortgage: number;
  otherLiabilities: number;
  notes: string | null;
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface NetWorthMilestone {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  targetNetWorth: number;
  targetDate: string | null;
  achievedDate: string | null;
  isAchieved: boolean;
  icon: string | null;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown> | null;
}

export interface NetWorthSummary {
  currentNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  changeFromLastMonth: number;
  changeFromLastYear: number;
  allTimeHigh: number;
  allTimeHighDate: string;
  allTimeLow: number;
  allTimeLowDate: string;
}

export interface NetWorthCalculation {
  cash: number;
  investments: number;
  property: number;
  otherAssets: number;
  totalAssets: number;
  creditCardDebt: number;
  loans: number;
  mortgage: number;
  otherLiabilities: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface CreateSnapshotInput {
  userId: string;
  snapshotDate: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateMilestoneInput {
  userId: string;
  title: string;
  description?: string;
  targetNetWorth: number;
  targetDate?: string;
  icon?: string;
  color?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Net Worth Calculation
// ============================================================================

/**
 * Calculate current net worth for a user
 */
export async function calculateNetWorth(
  db: D1Database,
  userId: string
): Promise<NetWorthCalculation> {
  // Get account balances (cash)
  const accountsResult = await db
    .prepare(`SELECT COALESCE(SUM(balance), 0) as total FROM accounts WHERE user_id = ? AND is_active = 1`)
    .bind(userId)
    .first();
  const cash = Number((accountsResult?.total as number) || 0);

  // Get investment values
  const investmentsResult = await db
    .prepare(`SELECT COALESCE(SUM(total_value), 0) as total FROM investment_accounts WHERE user_id = ? AND is_active = 1`)
    .bind(userId)
    .first();
  const investments = Number((investmentsResult?.total as number) || 0);

  // Property would come from real estate assets (not implemented yet)
  const property = 0;

  // Other assets (not tracked separately yet)
  const otherAssets = 0;

  const totalAssets = cash + investments + property + otherAssets;

  // Get credit card debt
  const creditCardsResult = await db
    .prepare(`SELECT COALESCE(SUM(current_balance), 0) as total FROM credit_cards WHERE user_id = ? AND is_active = 1`)
    .bind(userId)
    .first();
  const creditCardDebt = Number((creditCardsResult?.total as number) || 0);

  // Get loan balances
  const loansResult = await db
    .prepare(`SELECT COALESCE(SUM(outstanding_balance), 0) as total FROM loans WHERE user_id = ? AND is_active = 1`)
    .bind(userId)
    .first();
  const loans = Number((loansResult?.total as number) || 0);

  // Mortgage would come from property loans (not implemented yet)
  const mortgage = 0;

  // Other liabilities (not tracked separately yet)
  const otherLiabilities = 0;

  const totalLiabilities = creditCardDebt + loans + mortgage + otherLiabilities;

  const netWorth = totalAssets - totalLiabilities;

  return {
    cash,
    investments,
    property,
    otherAssets,
    totalAssets,
    creditCardDebt,
    loans,
    mortgage,
    otherLiabilities,
    totalLiabilities,
    netWorth,
  };
}

// ============================================================================
// Net Worth Snapshots
// ============================================================================

/**
 * Get net worth snapshots for a user
 */
export async function getNetWorthSnapshots(
  db: D1Database,
  userId: string,
  options: { limit?: number; months?: number } = {}
): Promise<NetWorthSnapshot[]> {
  const { limit = 100, months = 24 } = options;

  const result = await db
    .prepare(
      `SELECT * FROM net_worth_snapshots
       WHERE user_id = ?
         AND snapshot_date >= date('now', '-${months} months')
       ORDER BY snapshot_date DESC
       LIMIT ?`
    )
    .bind(userId, limit)
    .all();

  return (result.results || []).map(mapRowToSnapshot);
}

/**
 * Get latest net worth snapshot
 */
export async function getLatestNetWorthSnapshot(
  db: D1Database,
  userId: string
): Promise<NetWorthSnapshot | null> {
  const result = await db
    .prepare(`SELECT * FROM net_worth_snapshots WHERE user_id = ? ORDER BY snapshot_date DESC LIMIT 1`)
    .bind(userId)
    .first();

  return result ? mapRowToSnapshot(result) : null;
}

/**
 * Create net worth snapshot
 */
export async function createNetWorthSnapshot(
  db: D1Database,
  input: CreateSnapshotInput
): Promise<NetWorthSnapshot> {
  // Calculate current net worth
  const calculation = await calculateNetWorth(db, input.userId);

  const id = crypto.randomUUID();
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  await db
    .prepare(
      `INSERT INTO net_worth_snapshots (
        id, user_id, snapshot_date,
        total_assets, total_liabilities, net_worth,
        cash, investments, property, other_assets,
        credit_card_debt, loans, mortgage, other_liabilities,
        notes, is_manual, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.userId,
      input.snapshotDate,
      calculation.totalAssets,
      calculation.totalLiabilities,
      calculation.netWorth,
      calculation.cash,
      calculation.investments,
      calculation.property,
      calculation.otherAssets,
      calculation.creditCardDebt,
      calculation.loans,
      calculation.mortgage,
      calculation.otherLiabilities,
      input.notes || null,
      0, // Auto-generated snapshot
      metadataJson
    )
    .run();

  return getNetWorthSnapshotById(db, id) as Promise<NetWorthSnapshot>;
}

/**
 * Create manual net worth snapshot
 */
export async function createManualNetWorthSnapshot(
  db: D1Database,
  userId: string,
  snapshotDate: string,
  data: Partial<Omit<NetWorthCalculation, "netWorth">>,
  notes?: string
): Promise<NetWorthSnapshot> {
  const totalAssets = (data.cash || 0) + (data.investments || 0) + (data.property || 0) + (data.otherAssets || 0);
  const totalLiabilities = (data.creditCardDebt || 0) + (data.loans || 0) + (data.mortgage || 0) + (data.otherLiabilities || 0);
  const netWorth = totalAssets - totalLiabilities;

  const id = crypto.randomUUID();

  await db
    .prepare(
      `INSERT INTO net_worth_snapshots (
        id, user_id, snapshot_date,
        total_assets, total_liabilities, net_worth,
        cash, investments, property, other_assets,
        credit_card_debt, loans, mortgage, other_liabilities,
        notes, is_manual
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .bind(
      id,
      userId,
      snapshotDate,
      totalAssets,
      totalLiabilities,
      netWorth,
      data.cash || 0,
      data.investments || 0,
      data.property || 0,
      data.otherAssets || 0,
      data.creditCardDebt || 0,
      data.loans || 0,
      data.mortgage || 0,
      data.otherLiabilities || 0,
      notes || null
    )
    .run();

  return getNetWorthSnapshotById(db, id) as Promise<NetWorthSnapshot>;
}

/**
 * Delete net worth snapshot
 */
export async function deleteNetWorthSnapshot(
  db: D1Database,
  snapshotId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM net_worth_snapshots WHERE id = ? AND user_id = ?`)
    .bind(snapshotId, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

async function getNetWorthSnapshotById(
  db: D1Database,
  snapshotId: string
): Promise<NetWorthSnapshot | null> {
  const result = await db
    .prepare(`SELECT * FROM net_worth_snapshots WHERE id = ?`)
    .bind(snapshotId)
    .first();

  return result ? mapRowToSnapshot(result) : null;
}

// ============================================================================
// Net Worth Summary
// ============================================================================

/**
 * Get net worth summary with statistics
 */
export async function getNetWorthSummary(
  db: D1Database,
  userId: string
): Promise<NetWorthSummary> {
  const currentCalculation = await calculateNetWorth(db, userId);
  const currentNetWorth = currentCalculation.netWorth;

  // Get all-time high
  const athResult = await db
    .prepare(`SELECT net_worth, snapshot_date FROM net_worth_snapshots WHERE user_id = ? ORDER BY net_worth DESC LIMIT 1`)
    .bind(userId)
    .first();

  const allTimeHigh = athResult ? Number(athResult.net_worth) : currentNetWorth;
  const allTimeHighDate = athResult ? String(athResult.snapshot_date) : new Date().toISOString().split("T")[0];

  // Get all-time low
  const atlResult = await db
    .prepare(`SELECT net_worth, snapshot_date FROM net_worth_snapshots WHERE user_id = ? ORDER BY net_worth ASC LIMIT 1`)
    .bind(userId)
    .first();

  const allTimeLow = atlResult ? Number(atlResult.net_worth) : currentNetWorth;
  const allTimeLowDate = atlResult ? String(atlResult.snapshot_date) : new Date().toISOString().split("T")[0];

  // Get change from last month
  const lastMonthResult = await db
    .prepare(`SELECT net_worth FROM net_worth_snapshots WHERE user_id = ? AND snapshot_date <= date('now', '-1 month') ORDER BY snapshot_date DESC LIMIT 1`)
    .bind(userId)
    .first();

  const changeFromLastMonth = lastMonthResult
    ? currentNetWorth - Number(lastMonthResult.net_worth)
    : 0;

  // Get change from last year
  const lastYearResult = await db
    .prepare(`SELECT net_worth FROM net_worth_snapshots WHERE user_id = ? AND snapshot_date <= date('now', '-1 year') ORDER BY snapshot_date DESC LIMIT 1`)
    .bind(userId)
    .first();

  const changeFromLastYear = lastYearResult
    ? currentNetWorth - Number(lastYearResult.net_worth)
    : 0;

  return {
    currentNetWorth,
    totalAssets: currentCalculation.totalAssets,
    totalLiabilities: currentCalculation.totalLiabilities,
    changeFromLastMonth,
    changeFromLastYear,
    allTimeHigh,
    allTimeHighDate,
    allTimeLow,
    allTimeLowDate,
  };
}

// ============================================================================
// Net Worth Milestones
// ============================================================================

/**
 * Get net worth milestones for a user
 */
export async function getNetWorthMilestones(
  db: D1Database,
  userId: string,
  options: { includeAchieved?: boolean } = {}
): Promise<NetWorthMilestone[]> {
  const { includeAchieved = true } = options;

  const conditions = ["user_id = ?"];
  const params: Array<string | number> = [userId];

  if (!includeAchieved) {
    conditions.push("is_achieved = 0");
  }

  const result = await db
    .prepare(`SELECT * FROM net_worth_milestones WHERE ${conditions.join(" AND ")} ORDER BY target_net_worth ASC`)
    .bind(...params)
    .all();

  return (result.results || []).map(mapRowToMilestone);
}

/**
 * Create net worth milestone
 */
export async function createNetWorthMilestone(
  db: D1Database,
  input: CreateMilestoneInput
): Promise<NetWorthMilestone> {
  const id = crypto.randomUUID();
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  await db
    .prepare(
      `INSERT INTO net_worth_milestones (
        id, user_id, title, description, target_net_worth, target_date, icon, color, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.userId,
      input.title,
      input.description || null,
      input.targetNetWorth,
      input.targetDate || null,
      input.icon || null,
      input.color || null,
      metadataJson
    )
    .run();

  return getNetWorthMilestoneById(db, id) as Promise<NetWorthMilestone>;
}

/**
 * Update net worth milestone achievement status
 */
export async function updateMilestoneAchievement(
  db: D1Database,
  milestoneId: string,
  userId: string,
  isAchieved: boolean
): Promise<NetWorthMilestone | null> {
  await db
    .prepare(
      `UPDATE net_worth_milestones
       SET is_achieved = ?,
           achieved_date = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END,
           updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    )
    .bind(isAchieved ? 1 : 0, isAchieved ? 1 : 0, milestoneId, userId)
    .run();

  return getNetWorthMilestoneById(db, milestoneId);
}

/**
 * Delete net worth milestone
 */
export async function deleteNetWorthMilestone(
  db: D1Database,
  milestoneId: string,
  userId: string
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM net_worth_milestones WHERE id = ? AND user_id = ?`)
    .bind(milestoneId, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}

async function getNetWorthMilestoneById(
  db: D1Database,
  milestoneId: string
): Promise<NetWorthMilestone | null> {
  const result = await db
    .prepare(`SELECT * FROM net_worth_milestones WHERE id = ?`)
    .bind(milestoneId)
    .first();

  return result ? mapRowToMilestone(result) : null;
}

/**
 * Check and update milestone achievements
 */
export async function checkMilestoneAchievements(
  db: D1Database,
  userId: string
): Promise<void> {
  const currentCalculation = await calculateNetWorth(db, userId);
  const currentNetWorth = currentCalculation.netWorth;

  // Get unachieved milestones
  const milestones = await getNetWorthMilestones(db, userId, { includeAchieved: false });

  for (const milestone of milestones) {
    if (currentNetWorth >= milestone.targetNetWorth) {
      await updateMilestoneAchievement(db, milestone.id, userId, true);
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function mapRowToSnapshot(row: Record<string, unknown>): NetWorthSnapshot {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    snapshotDate: String(row.snapshot_date),
    totalAssets: Number(row.total_assets),
    totalLiabilities: Number(row.total_liabilities),
    netWorth: Number(row.net_worth),
    cash: Number(row.cash),
    investments: Number(row.investments),
    property: Number(row.property),
    otherAssets: Number(row.other_assets),
    creditCardDebt: Number(row.credit_card_debt),
    loans: Number(row.loans),
    mortgage: Number(row.mortgage),
    otherLiabilities: Number(row.other_liabilities),
    notes: row.notes ? String(row.notes) : null,
    isManual: Boolean(row.is_manual),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : null,
  };
}

function mapRowToMilestone(row: Record<string, unknown>): NetWorthMilestone {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    targetNetWorth: Number(row.target_net_worth),
    targetDate: row.target_date ? String(row.target_date) : null,
    achievedDate: row.achieved_date ? String(row.achieved_date) : null,
    isAchieved: Boolean(row.is_achieved),
    icon: row.icon ? String(row.icon) : null,
    color: row.color ? String(row.color) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    metadata: row.metadata ? JSON.parse(String(row.metadata)) : null,
  };
}
