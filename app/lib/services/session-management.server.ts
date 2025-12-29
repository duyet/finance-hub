/**
 * Session Management Service
 *
 * Track active sessions, login history, and security events
 */

import type { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";
import { sha256 } from "oslo/crypto";
import { encodeHex } from "oslo/encoding";

// ============================================================================
// Types
// ============================================================================

export interface UserSession {
  id: string;
  userId: string;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  lastActiveAt: string;
  createdAt: string;
  expiresAt: string;
  isRevoked: boolean;
  revokedAt?: string;
}

export interface LoginHistory {
  id: string;
  userId: string;
  loginType: "password" | "2fa" | "backup_code" | "social" | "sso";
  ipAddress?: string;
  userAgent?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  success: boolean;
  failureReason?: string;
  twoFactorUsed: boolean;
  location?: string;
  createdAt: string;
}

export interface SecurityEvent {
  id: string;
  userId?: string;
  eventType:
    | "password_change"
    | "email_change"
    | "2fa_enabled"
    | "2fa_disabled"
    | "2fa_verified"
    | "session_revoked"
    | "all_sessions_revoked"
    | "suspicious_activity"
    | "login_attempt_failed"
    | "backup_code_used";
  ipAddress?: string;
  userAgent?: string;
  metadata?: string; // JSON
  createdAt: string;
}

// ============================================================================
// Device Detection
// ============================================================================

function parseUserAgent(userAgent: string): {
  deviceType: string;
  browser: string;
  os: string;
} {
  const ua = userAgent.toLowerCase();

  // Device type
  let deviceType = "desktop";
  if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
    deviceType = "mobile";
  } else if (/tablet|ipad/i.test(ua)) {
    deviceType = "tablet";
  }

  // OS
  let os = "Unknown";
  if (/windows/.test(ua)) os = "Windows";
  else if (/mac|os x/.test(ua)) os = "macOS";
  else if (/linux/.test(ua)) os = "Linux";
  else if (/android/.test(ua)) os = "Android";
  else if (/ios|iphone|ipad/.test(ua)) os = "iOS";

  // Browser
  let browser = "Unknown";
  if (/chrome/.test(ua)) browser = "Chrome";
  else if (/firefox/.test(ua)) browser = "Firefox";
  else if (/safari/.test(ua)) browser = "Safari";
  else if (/edge/.test(ua)) browser = "Edge";

  return { deviceType, browser, os };
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Create a user session record
 */
export async function createUserSession(
  db: D1Database,
  userId: string,
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string> {
  const sessionId = nanoid();
  const tokenHash = await encodeHex(await sha256(new TextEncoder().encode(token)));

  const deviceInfo = userAgent ? parseUserAgent(userAgent) : null;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db
    .prepare(
      `INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, device_type, browser, os, last_active_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`
    )
    .bind(
      sessionId,
      userId,
      tokenHash,
      ipAddress || null,
      userAgent || null,
      deviceInfo?.deviceType || null,
      deviceInfo?.browser || null,
      deviceInfo?.os || null,
      expiresAt.toISOString()
    )
    .run();

  return sessionId;
}

/**
 * Get active sessions for a user
 */
export async function getUserSessions(db: D1Database, userId: string): Promise<UserSession[]> {
  const sessions = await db
    .prepare(
      `SELECT * FROM user_sessions
       WHERE user_id = ? AND is_revoked = 0 AND expires_at > datetime('now')
       ORDER BY created_at DESC`
    )
    .bind(userId)
    .all();

  return sessions.results as UserSession[];
}

/**
 * Revoke a specific session
 */
export async function revokeSession(db: D1Database, sessionId: string): Promise<void> {
  await db
    .prepare(`UPDATE user_sessions SET is_revoked = 1, revoked_at = datetime('now') WHERE id = ?`)
    .bind(sessionId)
    .run();
}

/**
 * Revoke all sessions except current
 */
export async function revokeAllOtherSessions(
  db: D1Database,
  userId: string,
  currentSessionId: string
): Promise<void> {
  await db
    .prepare(
      `UPDATE user_sessions SET is_revoked = 1, revoked_at = datetime('now')
       WHERE user_id = ? AND id != ? AND is_revoked = 0`
    )
    .bind(userId, currentSessionId)
    .run();
}

/**
 * Update session last active time
 */
export async function updateSessionActivity(db: D1Database, sessionId: string): Promise<void> {
  await db
    .prepare(`UPDATE user_sessions SET last_active_at = datetime('now') WHERE id = ?`)
    .bind(sessionId)
    .run();
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(db: D1Database): Promise<void> {
  await db
    .prepare(`DELETE FROM user_sessions WHERE expires_at < datetime('now') OR is_revoked = 1`)
    .run();
}

// ============================================================================
// Login History
// ============================================================================

/**
 * Record a login attempt
 */
export async function recordLogin(
  db: D1Database,
  userId: string,
  loginType: LoginHistory["loginType"],
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  failureReason?: string,
  twoFactorUsed = false,
  location?: string
): Promise<void> {
  const loginId = nanoid();
  const deviceInfo = userAgent ? parseUserAgent(userAgent) : null;

  await db
    .prepare(
      `INSERT INTO login_history (id, user_id, login_type, ip_address, user_agent, device_type, browser, os, success, failure_reason, two_factor_used, location)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      loginId,
      userId,
      loginType,
      ipAddress || null,
      userAgent || null,
      deviceInfo?.deviceType || null,
      deviceInfo?.browser || null,
      deviceInfo?.os || null,
      success ? 1 : 0,
      failureReason || null,
      twoFactorUsed ? 1 : 0,
      location || null
    )
    .run();
}

/**
 * Get login history for a user
 */
export async function getLoginHistory(
  db: D1Database,
  userId: string,
  limit = 20
): Promise<LoginHistory[]> {
  const history = await db
    .prepare(
      `SELECT * FROM login_history
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(userId, limit)
    .all();

  return history.results as LoginHistory[];
}

// ============================================================================
// Security Events
// ============================================================================

/**
 * Log a security event
 */
export async function logSecurityEvent(
  db: D1Database,
  eventType: SecurityEvent["eventType"],
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const eventId = nanoid();

  await db
    .prepare(
      `INSERT INTO security_events (id, user_id, event_type, ip_address, user_agent, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      eventId,
      userId || null,
      eventType,
      ipAddress || null,
      userAgent || null,
      metadata ? JSON.stringify(metadata) : null
    )
    .run();
}

/**
 * Get security events for a user
 */
export async function getSecurityEvents(
  db: D1Database,
  userId: string,
  limit = 50
): Promise<SecurityEvent[]> {
  const events = await db
    .prepare(
      `SELECT * FROM security_events
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(userId, limit)
    .all();

  return events.results as SecurityEvent[];
}

/**
 * Get recent failed login attempts for security monitoring
 */
export async function getRecentFailedLogins(
  db: D1Database,
  userId: string,
  minutes = 15
): Promise<number> {
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count FROM login_history
       WHERE user_id = ? AND success = 0 AND created_at > datetime('now', '-' || ? || ' minutes')`
    )
    .bind(userId, minutes)
    .first();

  return (result?.count as number) || 0;
}
