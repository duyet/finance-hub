/**
 * Two-Factor Authentication Service
 *
 * TOTP-based 2FA using time-based one-time passwords
 */

import type { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";

// ============================================================================
// Types
// ============================================================================

export interface TwoFactorAuth {
  id: string;
  userId: string;
  isEnabled: boolean;
  secret: string; // Encrypted
  backupCodes: string[]; // Encrypted
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TwoFactorSession {
  id: string;
  userId: string;
  challenge: string;
  expiresAt: string;
  verifiedAt?: string;
  createdAt: string;
}

// ============================================================================
// TOTP Functions (using crypto.subtle for HMAC-SHA1)
// ============================================================================

/**
 * Generate TOTP secret (base32 encoded)
 */
function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const secret = Array.from({ length: 32 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
  return secret;
}

/**
 * Convert base32 to buffer
 */
function base32ToBuffer(base32: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = base32
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, "")
    .split("")
    .map((char) => alphabet.indexOf(char))
    .filter((idx) => idx !== -1);

  const chunkSize = 5;
  const bytes: number[] = [];

  for (let i = 0; i < bits.length; i += 8) {
    const chunk = bits.slice(i, i + 8);
    if (chunk.length < 8) break;

    const octet =
      (chunk[0] << 35) +
      (chunk[1] << 30) +
      (chunk[2] << 25) +
      (chunk[3] << 20) +
      (chunk[4] << 15) +
      (chunk[5] << 10) +
      (chunk[6] << 5) +
      chunk[7];

    bytes.push((octet >> 24) & 0xff);
    bytes.push((octet >> 16) & 0xff);
    bytes.push((octet >> 8) & 0xff);
    bytes.push(octet & 0xff);
  }

  return new Uint8Array(bytes);
}

/**
 * Generate TOTP code for given time and counter
 */
async function generateTOTP(secret: string, time: number = Date.now()): Promise<string> {
  const counter = Math.floor(time / 30000); // 30-second steps
  const counterBuffer = new ArrayBuffer(8);
  const view = new DataView(counterBuffer);
  view.setUint32(4, counter, false); // Big-endian

  const key = base32ToBuffer(secret);

  // Using Web Crypto API for HMAC-SHA1
  const algorithm = { name: "HMAC", hash: "SHA-1" };
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    algorithm,
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    algorithm,
    cryptoKey,
    new Uint8Array(view.buffer)
  );

  // Dynamic truncation
  const offset = signature[signature.length - 1] & 0x0f;
  const binary =
    ((signature[offset] & 0x7f) << 24) |
    ((signature[offset + 1] & 0xff) << 16) |
    ((signature[offset + 2] & 0xff) << 8) |
    (signature[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, "0");
}

/**
 * Verify TOTP code
 */
async function verifyTOTP(secret: string, code: string, window: number = 1): Promise<boolean> {
  const time = Date.now();
  const counter = Math.floor(time / 30000);

  for (let i = -window; i <= window; i++) {
    const counterBuffer = new ArrayBuffer(8);
    const view = new DataView(counterBuffer);
    view.setUint32(4, counter + i, false);

    const expectedCode = await generateTOTP(secret, time + i * 30000);
    if (expectedCode === code) {
      return true;
    }
  }

  return false;
}

/**
 * Generate backup codes (10 codes)
 */
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = Array.from({ length: 8 }, () =>
      Math.floor(Math.random() * 10).toString()
    ).join("");
    codes.push(code);
  }
  return codes;
}

/**
 * Simple encryption (for demo - use proper encryption in production)
 */
function encrypt(text: string): string {
  // In production, use proper encryption like AES-GCM
  return Buffer.from(text).toString("base64");
}

function decrypt(ciphertext: string): string {
  return Buffer.from(ciphertext, "base64").toString();
}

// ============================================================================
// 2FA Management
// ============================================================================

/**
 * Generate 2FA secret for user
 */
export async function generateTwoFactorSecret(
  db: D1Database,
  userId: string
): Promise<{ secret: string; backupCodes: string[]; qrCodeUrl: string }> {
  const secret = generateSecret();
  const backupCodes = generateBackupCodes();

  const encryptedSecret = encrypt(secret);
  const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes));

  await db
    .prepare(
      `INSERT OR REPLACE INTO two_factor_auth (id, user_id, secret, backup_codes, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
    )
    .bind(nanoid(), userId, encryptedSecret, encryptedBackupCodes)
    .run();

  // Generate QR code URL (otpauth:// format)
  const qrCodeUrl = `otpauth://totp/FinanceHub:${userId}?secret=${secret}&issuer=FinanceHub&algorithm=SHA1&digits=6&period=30`;

  return { secret, backupCodes, qrCodeUrl };
}

/**
 * Verify and enable 2FA
 */
export async function verifyAndEnableTwoFactor(
  db: D1Database,
  userId: string,
  code: string
): Promise<boolean> {
  const result = await db
    .prepare(`SELECT secret FROM two_factor_auth WHERE user_id = ?`)
    .bind(userId)
    .first();

  if (!result) return false;

  const secret = decrypt(result.secret as string);
  const isValid = await verifyTOTP(secret, code);

  if (isValid) {
    await db
      .prepare(`UPDATE two_factor_auth SET is_enabled = 1, verified_at = datetime('now') WHERE user_id = ?`)
      .bind(userId)
      .run();
  }

  return isValid;
}

/**
 * Verify 2FA during login
 */
export async function verifyTwoFactorCode(
  db: D1Database,
  userId: string,
  code: string
): Promise<boolean> {
  const result = await db
    .prepare(`SELECT secret, backup_codes FROM two_factor_auth WHERE user_id = ? AND is_enabled = 1`)
    .bind(userId)
    .first();

  if (!result) return false;

  // First try TOTP
  const secret = decrypt(result.secret as string);
  if (await verifyTOTP(secret, code)) {
    return true;
  }

  // Then try backup codes
  try {
    const backupCodes = JSON.parse(decrypt(result.backup_codes as string)) as string[];
    const codeIndex = backupCodes.indexOf(code);

    if (codeIndex !== -1) {
      // Remove used backup code
      backupCodes.splice(codeIndex, 1);
      await db
        .prepare(`UPDATE two_factor_auth SET backup_codes = ? WHERE user_id = ?`)
        .bind(encrypt(JSON.stringify(backupCodes)), userId)
        .run();
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Check if user has 2FA enabled
 */
export async function isTwoFactorEnabled(db: D1Database, userId: string): Promise<boolean> {
  const result = await db
    .prepare(`SELECT is_enabled FROM two_factor_auth WHERE user_id = ?`)
    .bind(userId)
    .first();

  return (result?.is_enabled as number) === 1;
}

/**
 * Disable 2FA
 */
export async function disableTwoFactor(db: D1Database, userId: string): Promise<void> {
  await db
    .prepare(`DELETE FROM two_factor_auth WHERE user_id = ?`)
    .bind(userId)
    .run();
}

/**
 * Get 2FA status
 */
export async function getTwoFactorStatus(
  db: D1Database,
  userId: string
): Promise<{ enabled: boolean; verified: boolean; backupCodesCount: number } | null> {
  const result = await db
    .prepare(`SELECT * FROM two_factor_auth WHERE user_id = ?`)
    .bind(userId)
    .first();

  if (!result) return null;

  const backupCodes = JSON.parse(decrypt(result.backup_codes as string) || "[]");

  return {
    enabled: result.is_enabled === 1,
    verified: !!result.verified_at,
    backupCodesCount: backupCodes.length,
  };
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes(
  db: D1Database,
  userId: string
): Promise<string[]> {
  const backupCodes = generateBackupCodes();
  const encryptedBackupCodes = encrypt(JSON.stringify(backupCodes));

  await db
    .prepare(`UPDATE two_factor_auth SET backup_codes = ?, updated_at = datetime('now') WHERE user_id = ?`)
    .bind(encryptedBackupCodes, userId)
    .run();

  return backupCodes;
}

/**
 * Create 2FA verification session
 */
export async function createTwoFactorSession(
  db: D1Database,
  userId: string
): Promise<string> {
  const sessionId = nanoid();
  const challenge = nanoid(32);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

  await db
    .prepare(
      `INSERT INTO two_factor_sessions (id, user_id, challenge, expires_at, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
    .bind(sessionId, userId, challenge, expiresAt)
    .run();

  return challenge;
}

/**
 * Verify 2FA session
 */
export async function verifyTwoFactorSession(
  db: D1Database,
  challenge: string,
  code: string
): Promise<boolean> {
  const session = await db
    .prepare(`SELECT * FROM two_factor_sessions WHERE challenge = ? AND expires_at > datetime('now')`)
    .bind(challenge)
    .first();

  if (!session) return false;

  const verified = await verifyTwoFactorCode(db, session.user_id as string, code);

  if (verified) {
    await db
      .prepare(`UPDATE two_factor_sessions SET verified_at = datetime('now') WHERE id = ?`)
      .bind(session.id)
      .run();
  }

  return verified;
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(db: D1Database): Promise<void> {
  await db
    .prepare(`DELETE FROM two_factor_sessions WHERE expires_at < datetime('now')`)
    .run();
}
