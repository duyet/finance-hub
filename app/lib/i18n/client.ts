import { useRouteLoaderData } from "react-router";
import type { Locale } from "./i18n.config";

/**
 * Get translations and locale from the root loader
 *
 * This hook provides access to i18n data passed from the server.
 * It's type-safe and works with React Router's loader data system.
 *
 * @returns I18n client context with locale, translations, and utility functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, locale, formatCurrency } = useI18n();
 *
 *   return (
 *     <div>
 *       <h1>{t('nav.dashboard')}</h1>
 *       <p>{formatCurrency(1234560, 'VND')}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useI18n() {
  // Get loader data from root route
  const rootData = useRouteLoaderData("root") as {
    locale?: Locale;
    translations?: Record<string, unknown>;
  } | undefined;

  if (!rootData?.locale || !rootData?.translations) {
    console.warn("i18n data not available from root loader");
    return createFallbackI18n();
  }

  const { locale, translations } = rootData;

  return {
    locale,
    translations,

    /**
     * Translate a key using dot notation
     *
     * @param key - Translation key in dot notation (e.g., "nav.dashboard")
     * @param params - Optional parameters for interpolation
     * @returns Translated string or key if not found
     *
     * @example
     * ```tsx
     * t('nav.dashboard') // "Tổng quan" (in Vietnamese)
     * t('validation.minLength', { min: 5 }) // "Phải có ít nhất 5 ký tự"
     * ```
     */
    t: (key: string, params?: Record<string, string | number>): string => {
      return translate(translations, key, params, locale);
    },

    /**
     * Check if a translation key exists
     *
     * @param key - Translation key to check
     * @returns true if key exists, false otherwise
     */
    has: (key: string): boolean => {
      return hasKey(translations, key);
    },

    /**
     * Format currency based on locale
     *
     * @param amount - Amount to format
     * @param currency - Currency code (VND, USD, etc.)
     * @returns Formatted currency string
     *
     * @example
     * ```tsx
     * formatCurrency(1234560, 'VND') // "1.234.560 ₫" (VI) or "$1,234.56" (EN)
     * ```
     */
    formatCurrency: (amount: number, currency: string = "VND"): string => {
      return formatCurrencyLocale(amount, currency, locale);
    },

    /**
     * Format date based on locale
     *
     * @param date - Date to format
     * @param format - Format type (short, medium, long, full)
     * @returns Formatted date string
     *
     * @example
     * ```tsx
     * formatDate(new Date(), 'short') // "28/12/2025" (VI) or "12/28/2025" (EN)
     * ```
     */
    formatDate: (
      date: Date | string | number,
      format: "short" | "medium" | "long" | "full" = "short"
    ): string => {
      return formatDateLocale(date, locale, format);
    },

    /**
     * Format number based on locale
     *
     * @param value - Number to format
     * @param options - Intl.NumberFormat options
     * @returns Formatted number string
     */
    formatNumber: (
      value: number,
      options?: Intl.NumberFormatOptions
    ): string => {
      return new Intl.NumberFormat(locale, options).format(value);
    },

    /**
     * Format percentage based on locale
     *
     * @param value - Value to format (e.g., 75 for 75%)
     * @param decimals - Number of decimal places
     * @returns Formatted percentage string
     */
    formatPercentage: (value: number, decimals: number = 2): string => {
      return new Intl.NumberFormat(locale, {
        style: "percent",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value / 100);
    },
  };
}

/**
 * Translate function implementation
 */
function translate(
  translations: Record<string, unknown>,
  key: string,
  params?: Record<string, string | number>,
  locale?: Locale
): string {
  const keys = key.split(".");
  let value: unknown = translations;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      // Key not found, return the key itself
      console.warn(`Translation key not found: ${key}`);
      return key;
    }
  }

  if (typeof value !== "string") {
    console.warn(`Translation value is not a string: ${key}`);
    return key;
  }

  let result = value;

  // Replace parameters in the string
  if (params) {
    for (const [param, value] of Object.entries(params)) {
      const placeholder = `{{${param}}}`;
      result = result.replace(new RegExp(placeholder, "g"), String(value));
    }
  }

  return result;
}

/**
 * Check if translation key exists
 */
function hasKey(translations: Record<string, unknown>, key: string): boolean {
  const keys = key.split(".");
  let value: unknown = translations;

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return false;
    }
  }

  return typeof value === "string";
}

/**
 * Format currency based on locale
 */
function formatCurrencyLocale(
  amount: number,
  currency: string,
  locale: Locale
): string {
  if (currency === "VND") {
    return formatVND(amount, locale);
  }

  const formatter = new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: currency as string,
  });

  return formatter.format(amount);
}

/**
 * Format Vietnamese Dong with dot separators
 */
function formatVND(amount: number, locale: Locale): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  // Format with dot separator for thousands
  const formatted = absAmount
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const result = `${formatted} ₫`;

  // Vietnamese uses parentheses for negative amounts
  if (isNegative) {
    return locale === "vi" ? `(${result})` : `-${result}`;
  }

  return result;
}

/**
 * Format date based on locale
 */
function formatDateLocale(
  date: Date | string | number,
  locale: Locale,
  format: "short" | "medium" | "long" | "full"
): string {
  const dateObj = typeof date === "object" ? date : new Date(date);

  const formats: Record<
    Locale,
    Record<string, Intl.DateTimeFormatOptions>
  > = {
    en: {
      short: { year: "numeric", month: "2-digit", day: "2-digit" },
      medium: { year: "numeric", month: "short", day: "numeric" },
      long: { year: "numeric", month: "long", day: "numeric" },
      full: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
    },
    vi: {
      short: { year: "numeric", month: "2-digit", day: "2-digit" },
      medium: { year: "numeric", month: "short", day: "numeric" },
      long: { year: "numeric", month: "long", day: "numeric" },
      full: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
    },
  };

  return new Intl.DateTimeFormat(locale, formats[locale][format]).format(
    dateObj
  );
}

/**
 * Fallback i18n context when data is not available
 */
function createFallbackI18n() {
  return {
    locale: "en" as Locale,
    translations: {},
    t: (key: string): string => key,
    has: (): boolean => false,
    formatCurrency: (amount: number): string => amount.toString(),
    formatDate: (date: Date | string | number): string =>
      new Date(date).toLocaleDateString(),
    formatNumber: (value: number): string => value.toString(),
    formatPercentage: (value: number): string => `${value}%`,
  };
}

/**
 * Type-safe translation keys
 * This provides autocomplete for translation keys
 */
export type TranslationKey =
  | "app.name"
  | "app.tagline"
  | "nav.dashboard"
  | "nav.transactions"
  | "nav.accounts"
  | "nav.creditCards"
  | "nav.loans"
  | "nav.settings"
  | "actions.save"
  | "actions.cancel"
  | "actions.delete"
  | "actions.edit"
  | "actions.add"
  | "actions.export"
  | "actions.search"
  | "common.loading"
  | "common.date"
  | "common.amount"
  | "common.balance"
  | "financial.income"
  | "financial.expense"
  | "financial.netWorth"
  | "financial.runway"
  | "financial.burnRate"
  | `string & ${string}`; // Allow arbitrary strings

/**
 * Hook with type-safe translation keys
 * Use this for better TypeScript support
 */
export function useI18nTyped() {
  const i18n = useI18n();

  return {
    ...i18n,
    /**
     * Type-safe translation function
     *
     * @param key - Type-safe translation key
     * @param params - Optional parameters for interpolation
     * @returns Translated string
     *
     * @example
     * ```tsx
     * const { t } = useI18nTyped();
     * t('nav.dashboard') // ✅ Valid - autocomplete available
     * t('invalid.key') // ❌ Type error
     * ```
     */
    t: (key: TranslationKey, params?: Record<string, string | number>): string => {
      return i18n.t(key, params);
    },
  };
}
