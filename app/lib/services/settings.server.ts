/**
 * Settings Server Utilities
 *
 * Handles user profile and preferences management operations.
 */

import type { D1Database } from "@cloudflare/workers-types";

/**
 * User profile data
 */
export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * User preferences data
 */
export interface UserPreferences {
  language: string;
  dateFormat: string;
  currencyFormat: string;
  theme: "light" | "dark" | "system";
}

/**
 * Get user profile data
 */
export async function getUserProfile(db: D1Database, userId: string): Promise<UserProfile | null> {
  const result = await db
    .prepare(
      `SELECT
        id,
        name,
        email,
        image as avatarUrl,
        default_currency as defaultCurrency,
        created_at as createdAt,
        updated_at as updatedAt
       FROM users
       WHERE id = ?`
    )
    .bind(userId)
    .first<UserProfile>();

  return result || null;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  db: D1Database,
  userId: string,
  data: {
    name?: string;
    defaultCurrency?: string;
  }
): Promise<UserProfile | null> {
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    values.push(data.name);
  }

  if (data.defaultCurrency !== undefined) {
    updates.push("default_currency = ?");
    values.push(data.defaultCurrency);
  }

  if (updates.length > 0) {
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(userId);

    await db
      .prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
  }

  return getUserProfile(db, userId);
}

/**
 * Get user preferences
 */
export async function getUserPreferences(db: D1Database, userId: string): Promise<UserPreferences> {
  const result = await db
    .prepare(
      `SELECT
        COALESCE(language, 'en') as language,
        COALESCE(date_format, 'DD/MM/YYYY') as dateFormat,
        COALESCE(currency_format, 'symbol') as currencyFormat,
        COALESCE(theme, 'system') as theme
       FROM users
       WHERE id = ?`
    )
    .bind(userId)
    .first<UserPreferences>();

  return (
    result || {
      language: "en",
      dateFormat: "DD/MM/YYYY",
      currencyFormat: "symbol",
      theme: "system",
    }
  );
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  db: D1Database,
  userId: string,
  data: Partial<UserPreferences>
): Promise<UserPreferences> {
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (data.language !== undefined) {
    updates.push("language = ?");
    values.push(data.language);
  }

  if (data.dateFormat !== undefined) {
    updates.push("date_format = ?");
    values.push(data.dateFormat);
  }

  if (data.currencyFormat !== undefined) {
    updates.push("currency_format = ?");
    values.push(data.currencyFormat);
  }

  if (data.theme !== undefined) {
    updates.push("theme = ?");
    values.push(data.theme);
  }

  if (updates.length > 0) {
    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(userId);

    await db
      .prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
  }

  return getUserPreferences(db, userId);
}

/**
 * Available date formats
 */
export const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (28/12/2024)", example: "28/12/2024" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (12/28/2024)", example: "12/28/2024" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (2024-12-28)", example: "2024-12-28" },
  { value: "DD.MM.YYYY", label: "DD.MM.YYYY (28.12.2024)", example: "28.12.2024" },
];

/**
 * Available currency formats
 */
export const CURRENCY_FORMATS = [
  { value: "symbol", label: "Symbol (1.000.000 ₫)", example: "1.000.000 ₫" },
  { value: "code", label: "Code (1.000.000 VND)", example: "1.000.000 VND" },
  { value: "compact", label: "Compact (1M ₫)", example: "1M ₫" },
];

/**
 * Available theme options
 */
export const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "System", icon: "💻" },
];

/**
 * Supported languages
 */
export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];
