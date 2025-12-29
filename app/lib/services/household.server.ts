/**
 * Household Sharing Service
 *
 * Enables multiple users to share financial data with role-based permissions
 */

import type { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";

// ============================================================================
// Types
// ============================================================================

export type HouseholdRole = "owner" | "admin" | "member" | "viewer";
export type PermissionLevel = "read" | "write" | "admin";

export interface Household {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  role: HouseholdRole;
  permissions: PermissionLevel;
  joinedAt: string;
  invitedBy?: string;
}

export interface HouseholdInvite {
  id: string;
  householdId: string;
  email: string;
  role: HouseholdRole;
  invitedBy: string;
  invitedByName?: string;
  token: string;
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
}

export interface HouseholdStats {
  totalMembers: number;
  sharedAccounts: number;
  sharedBudgets: number;
  sharedGoals: number;
}

// ============================================================================
// Household Management
// ============================================================================

/**
 * Create a new household
 */
export async function createHousehold(
  db: D1Database,
  userId: string,
  name: string
): Promise<Household> {
  const householdId = nanoid();
  const memberId = nanoid();
  const now = new Date().toISOString();

  // Create household
  await db
    .prepare(
      `INSERT INTO households (id, name, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(householdId, name, userId, now, now)
    .run();

  // Add creator as owner
  await db
    .prepare(
      `INSERT INTO household_members (id, household_id, user_id, role, permissions, joined_at)
       VALUES (?, ?, ?, 'owner', 'admin', ?)`
    )
    .bind(memberId, householdId, userId, now)
    .run();

  // Update user's household
  await db
    .prepare(`UPDATE users SET household_id = ? WHERE id = ?`)
    .bind(householdId, userId)
    .run();

  return {
    id: householdId,
    name,
    createdBy: userId,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get user's household
 */
export async function getUserHousehold(db: D1Database, userId: string): Promise<Household | null> {
  const result = await db
    .prepare(
      `SELECT h.* FROM households h
       JOIN household_members hm ON h.id = hm.household_id
       WHERE hm.user_id = ?`
    )
    .bind(userId)
    .first();

  if (!result) return null;

  // Get member count
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM household_members WHERE household_id = ?`)
    .bind(result.id as string)
    .first();

  return {
    id: result.id as string,
    name: result.name as string,
    createdBy: result.createdBy as string,
    createdAt: result.created_at as string,
    updatedAt: result.updated_at as string,
    memberCount: countResult?.count as number || 0,
  };
}

/**
 * Get household members
 */
export async function getHouseholdMembers(
  db: D1Database,
  householdId: string
): Promise<HouseholdMember[]> {
  const result = await db
    .prepare(
      `SELECT
        hm.id,
        hm.household_id,
        hm.user_id,
        u.name as user_name,
        u.email as user_email,
        hm.role,
        hm.permissions,
        hm.joined_at,
        hm.invited_by
       FROM household_members hm
       LEFT JOIN users u ON hm.user_id = u.id
       WHERE hm.household_id = ?
       ORDER BY
         CASE hm.role
           WHEN 'owner' THEN 1
           WHEN 'admin' THEN 2
           WHEN 'member' THEN 3
           WHEN 'viewer' THEN 4
         END,
         hm.joined_at ASC`
    )
    .bind(householdId)
    .all();

  return (result.results || []).map((row: any) => ({
    id: row.id,
    householdId: row.household_id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    role: row.role,
    permissions: row.permissions,
    joinedAt: row.joined_at,
    invitedBy: row.invited_by,
  }));
}

/**
 * Update member role
 */
export async function updateMemberRole(
  db: D1Database,
  householdId: string,
  memberId: string,
  role: HouseholdRole,
  permissions: PermissionLevel
): Promise<void> {
  await db
    .prepare(
      `UPDATE household_members
       SET role = ?, permissions = ?
       WHERE id = ? AND household_id = ?`
    )
    .bind(role, permissions, memberId, householdId)
    .run();
}

/**
 * Remove member from household
 */
export async function removeMember(
  db: D1Database,
  householdId: string,
  memberId: string
): Promise<void> {
  // Update user's household_id to null
  await db
    .prepare(
      `UPDATE users SET household_id = NULL
       WHERE id = (SELECT user_id FROM household_members WHERE id = ?)`
    )
    .bind(memberId)
    .run();

  // Remove membership
  await db
    .prepare(`DELETE FROM household_members WHERE id = ? AND household_id = ?`)
    .bind(memberId, householdId)
    .run();
}

/**
 * Leave household (user initiated)
 */
export async function leaveHousehold(
  db: D1Database,
  userId: string,
  householdId: string
): Promise<void> {
  // Update user's household_id
  await db
    .prepare(`UPDATE users SET household_id = NULL WHERE id = ?`)
    .bind(userId)
    .run();

  // Remove membership
  await db
    .prepare(`DELETE FROM household_members WHERE user_id = ? AND household_id = ?`)
    .bind(userId, householdId)
    .run();
}

// ============================================================================
// Invitations
// ============================================================================

/**
 * Create household invite
 */
export async function createInvite(
  db: D1Database,
  householdId: string,
  email: string,
  role: HouseholdRole,
  invitedBy: string,
  expiresHours: number = 72
): Promise<HouseholdInvite> {
  const inviteId = nanoid();
  const token = nanoid(32);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresHours * 60 * 60 * 1000).toISOString();

  await db
    .prepare(
      `INSERT INTO household_invites (id, household_id, email, role, invited_by, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(inviteId, householdId, email.toLowerCase(), role, invitedBy, token, expiresAt, now.toISOString())
    .run();

  return {
    id: inviteId,
    householdId,
    email: email.toLowerCase(),
    role,
    invitedBy,
    token,
    expiresAt,
    createdAt: now.toISOString(),
  };
}

/**
 * Get pending invites for household
 */
export async function getPendingInvites(
  db: D1Database,
  householdId: string
): Promise<HouseholdInvite[]> {
  const result = await db
    .prepare(
      `SELECT
        hi.id,
        hi.household_id,
        hi.email,
        hi.role,
        hi.invited_by,
        u.name as invited_by_name,
        hi.token,
        hi.expires_at,
        hi.created_at
       FROM household_invites hi
       LEFT JOIN users u ON hi.invited_by = u.id
       WHERE hi.household_id = ? AND hi.accepted_at IS NULL AND hi.expires_at > datetime('now')
       ORDER BY hi.created_at DESC`
    )
    .bind(householdId)
    .all();

  return (result.results || []).map((row: any) => ({
    id: row.id,
    householdId: row.household_id,
    email: row.email,
    role: row.role,
    invitedBy: row.invited_by,
    invitedByName: row.invited_by_name,
    token: row.token,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }));
}

/**
 * Accept invite
 */
export async function acceptInvite(
  db: D1Database,
  token: string,
  userId: string
): Promise<{ householdId: string; role: HouseholdRole } | null> {
  const invite = await db
    .prepare(`SELECT * FROM household_invites WHERE token = ? AND accepted_at IS NULL AND expires_at > datetime('now')`)
    .bind(token)
    .first();

  if (!invite) return null;

  const householdId = invite.household_id as string;
  const role = invite.role as HouseholdRole;
  const now = new Date().toISOString();

  // Create membership
  const memberId = nanoid();
  await db
    .prepare(
      `INSERT INTO household_members (id, household_id, user_id, role, permissions, joined_at)
       VALUES (?, ?, ?, ?, 'read', ?)`
    )
    .bind(memberId, householdId, userId, role, now)
    .run();

  // Update user's household
  await db
    .prepare(`UPDATE users SET household_id = ? WHERE id = ?`)
    .bind(householdId, userId)
    .run();

  // Mark invite as accepted
  await db
    .prepare(`UPDATE household_invites SET accepted_at = ? WHERE token = ?`)
    .bind(now, token)
    .run();

  return { householdId, role };
}

/**
 * Cancel/delete invite
 */
export async function cancelInvite(db: D1Database, inviteId: string): Promise<void> {
  await db.prepare(`DELETE FROM household_invites WHERE id = ?`).bind(inviteId).run();
}

/**
 * Get invites for user's email
 */
export async function getUserInvites(db: D1Database, email: string): Promise<HouseholdInvite[]> {
  const result = await db
    .prepare(
      `SELECT
        hi.id,
        hi.household_id,
        h.name as household_name,
        hi.email,
        hi.role,
        hi.invited_by,
        u.name as invited_by_name,
        hi.expires_at,
        hi.created_at
       FROM household_invites hi
       JOIN households h ON hi.household_id = h.id
       LEFT JOIN users u ON hi.invited_by = u.id
       WHERE hi.email = ? AND hi.accepted_at IS NULL AND hi.expires_at > datetime('now')
       ORDER BY hi.created_at DESC`
    )
    .bind(email.toLowerCase())
    .all();

  return (result.results || []).map((row: any) => ({
    ...row,
    token: "", // Don't expose token in list
  }));
}

// ============================================================================
// Shared Resources
// ============================================================================

/**
 * Get household statistics
 */
export async function getHouseholdStats(
  db: D1Database,
  householdId: string
): Promise<HouseholdStats> {
  const [members, accounts, budgets, goals] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as count FROM household_members WHERE household_id = ?`).bind(householdId).first(),
    db.prepare(`SELECT COUNT(*) as count FROM household_accounts WHERE household_id = ?`).bind(householdId).first(),
    db.prepare(`SELECT COUNT(*) as count FROM household_budgets WHERE household_id = ?`).bind(householdId).first(),
    db.prepare(`SELECT COUNT(*) as count FROM goals WHERE household_id = ?`).bind(householdId).first(),
  ]);

  return {
    totalMembers: (members?.count as number) || 0,
    sharedAccounts: (accounts?.count as number) || 0,
    sharedBudgets: (budgets?.count as number) || 0,
    sharedGoals: (goals?.count as number) || 0,
  };
}

/**
 * Share account with household
 */
export async function shareAccount(
  db: D1Database,
  householdId: string,
  accountId: string,
  userId: string
): Promise<void> {
  const linkId = nanoid();
  await db
    .prepare(
      `INSERT OR IGNORE INTO household_accounts (id, household_id, account_id, shared_by, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
    .bind(linkId, householdId, accountId, userId)
    .run();
}

/**
 * Unshare account
 */
export async function unshareAccount(db: D1Database, householdId: string, accountId: string): Promise<void> {
  await db
    .prepare(`DELETE FROM household_accounts WHERE household_id = ? AND account_id = ?`)
    .bind(householdId, accountId)
    .run();
}

/**
 * Check if user has permission for household
 */
export async function checkHouseholdPermission(
  db: D1Database,
  userId: string,
  householdId: string,
  requiredPermission: PermissionLevel
): Promise<boolean> {
  const member = await db
    .prepare(
      `SELECT permissions FROM household_members
       WHERE user_id = ? AND household_id = ?`
    )
    .bind(userId, householdId)
    .first();

  if (!member) return false;

  const permissions = member.permissions as string;
  if (permissions === "admin") return true;
  if (permissions === "write" && requiredPermission !== "admin") return true;
  return requiredPermission === "read";
}
