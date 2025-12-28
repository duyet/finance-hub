import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import type { Locale } from "./i18n.config";
import {
  getLocale,
  isSupportedLocale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
} from "./i18n.config";

// Currency codes
export type CurrencyCode = "VND" | "USD" | "EUR" | "GBP" | "JPY" | "SGD";

// Locale-specific formatting configurations
const LOCALE_CONFIGS = {
  en: {
    currency: {
      VND: { locale: "vi-VN", minimumFractionDigits: 0, maximumFractionDigits: 0 },
      USD: { locale: "en-US", minimumFractionDigits: 2, maximumFractionDigits: 2 },
      EUR: { locale: "de-DE", minimumFractionDigits: 2, maximumFractionDigits: 2 },
      GBP: { locale: "en-GB", minimumFractionDigits: 2, maximumFractionDigits: 2 },
      JPY: { locale: "ja-JP", minimumFractionDigits: 0, maximumFractionDigits: 0 },
      SGD: { locale: "en-SG", minimumFractionDigits: 2, maximumFractionDigits: 2 },
    },
    date: {
      short: "MM/DD/YYYY",
      medium: "MMM DD, YYYY",
      long: "MMMM DD, YYYY",
      full: "dddd, MMMM DD, YYYY",
      time: "h:mm A",
      dateTime: "MM/DD/YYYY h:mm A",
    },
  },
  vi: {
    currency: {
      VND: { locale: "vi-VN", minimumFractionDigits: 0, maximumFractionDigits: 0 },
      USD: { locale: "en-US", minimumFractionDigits: 2, maximumFractionDigits: 2 },
      EUR: { locale: "de-DE", minimumFractionDigits: 2, maximumFractionDigits: 2 },
      GBP: { locale: "en-GB", minimumFractionDigits: 2, maximumFractionDigits: 2 },
      JPY: { locale: "ja-JP", minimumFractionDigits: 0, maximumFractionDigits: 0 },
      SGD: { locale: "en-SG", minimumFractionDigits: 2, maximumFractionDigits: 2 },
    },
    date: {
      short: "DD/MM/YYYY",
      medium: "DD MMM YYYY",
      long: "DD MMMM YYYY",
      full: "dddd, DD MMMM YYYY",
      time: "HH:mm",
      dateTime: "DD/MM/YYYY HH:mm",
    },
  },
} as const;

/**
 * Get locale from request headers and cookies
 */
export function getLocaleFromRequest(request: Request): Locale {
  const cookieHeader = request.headers.get("Cookie");
  const acceptLanguage = request.headers.get("Accept-Language");
  return getLocale(cookieHeader, acceptLanguage);
}

/**
 * Set locale cookie in response
 */
export function setLocaleCookie(locale: Locale): string {
  return `locale=${locale}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${365 * 24 * 60 * 60}`;
}

/**
 * Format currency based on locale and currency code
 *
 * Vietnamese formatting (VND):
 * - Uses dot (.) as thousands separator: 1.234.560 ₫
 * - No decimal places for VND
 * - Negative numbers use parentheses: (1.234.560 ₫)
 *
 * English formatting (USD):
 * - Uses comma (,) as thousands separator: $1,234.56
 * - Two decimal places for USD
 * - Negative numbers use minus sign: -$1,234.56
 */
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = "VND",
  locale: Locale = DEFAULT_LOCALE,
  options?: {
    signDisplay?: "always" | "exceptZero" | "never" | "auto";
    compact?: boolean;
  }
): string {
  const config = LOCALE_CONFIGS[locale].currency[currency];

  const formatter = new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: options?.compact ? 0 : config.minimumFractionDigits,
    maximumFractionDigits: options?.compact ? 0 : config.maximumFractionDigits,
    signDisplay: options?.signDisplay || "auto",
  });

  // For Vietnamese locale with VND and negative amounts, wrap in parentheses
  if (locale === "vi" && currency === "VND" && amount < 0 && !options?.signDisplay) {
    const formatted = formatter.format(Math.abs(amount));
    return `(${formatted})`;
  }

  return formatter.format(amount);
}

/**
 * Format currency with custom separators for Vietnamese VND
 * This ensures dot (.) as thousands separator even in non-VN locales
 */
export function formatVND(amount: number, locale: Locale = DEFAULT_LOCALE): string {
  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;

  // Format with Vietnamese dot separator
  const formatted = absAmount
    .toFixed(0)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
    .replace(/,/g, ".");

  const result = `${formatted} ₫`;

  if (isNegative && locale === "vi") {
    return `(${result})`;
  } else if (isNegative) {
    return `-${result}`;
  }

  return result;
}

/**
 * Format date based on locale
 *
 * Vietnamese date format: DD/MM/YYYY
 * English date format: MM/DD/YYYY
 */
export function formatDate(
  date: Date | string | number,
  locale: Locale = DEFAULT_LOCALE,
  format: "short" | "medium" | "long" | "full" | "time" | "dateTime" = "short"
): string {
  const dateObj = typeof date === "object" ? date : new Date(date);

  // Use Intl for proper locale-specific formatting
  const formats: Record<Locale, Record<string, Intl.DateTimeFormatOptions>> = {
    en: {
      short: { year: "numeric", month: "2-digit", day: "2-digit" },
      medium: { year: "numeric", month: "short", day: "numeric" },
      long: { year: "numeric", month: "long", day: "numeric" },
      full: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
      time: { hour: "numeric", minute: "2-digit", hour12: true },
      dateTime: {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      },
    },
    vi: {
      short: { year: "numeric", month: "2-digit", day: "2-digit" },
      medium: { year: "numeric", month: "short", day: "numeric" },
      long: { year: "numeric", month: "long", day: "numeric" },
      full: { weekday: "long", year: "numeric", month: "long", day: "numeric" },
      time: { hour: "numeric", minute: "2-digit", hour12: false },
      dateTime: {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
        hour12: false,
      },
    },
  };

  const formatter = new Intl.DateTimeFormat(locale, formats[locale][format]);
  return formatter.format(dateObj);
}

/**
 * Format date range
 */
export function formatDateRange(
  startDate: Date | string | number,
  endDate: Date | string | number,
  locale: Locale = DEFAULT_LOCALE
): string {
  const start = typeof startDate === "object" ? startDate : new Date(startDate);
  const end = typeof endDate === "object" ? endDate : new Date(endDate);

  const startFormatted = formatDate(start, locale, "short");
  const endFormatted = formatDate(end, locale, "short");

  return locale === "vi"
    ? `${startFormatted} - ${endFormatted}`
    : `${startFormatted} - ${endFormatted}`;
}

/**
 * Format number based on locale
 */
export function formatNumber(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format percentage based on locale
 */
export function formatPercentage(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  decimals: number = 2
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Parse locale-safe number from string
 */
export function parseNumber(value: string, locale: Locale = DEFAULT_LOCALE): number {
  // Remove locale-specific formatting
  let cleaned = value;

  if (locale === "vi") {
    // Vietnamese uses . as thousands separator
    cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
  } else {
    // English uses , as thousands separator
    cleaned = cleaned.replace(/,/g, "");
  }

  return parseFloat(cleaned) || 0;
}

/**
 * Get i18n loader data for request
 */
export async function getI18nData(request: LoaderFunctionArgs["request"]): Promise<{
  locale: Locale;
  translations: Record<string, unknown>;
}> {
  const locale = getLocaleFromRequest(request);

  // Load translations from public/locales
  const translations = await loadTranslations(locale);

  return {
    locale,
    translations,
  };
}

/**
 * Load translations for a specific locale
 */
async function loadTranslations(
  locale: Locale
): Promise<Record<string, unknown>> {
  const namespaces = ["common", "dashboard", "transactions", "credit_cards", "loans", "settings"];
  const translations: Record<string, unknown> = {};

  for (const ns of namespaces) {
    try {
      // In a real implementation, you'd fetch from public/locales
      // For now, we'll return empty objects
      translations[ns] = {};
    } catch (error) {
      console.warn(`Failed to load ${ns} translations for ${locale}:`, error);
      translations[ns] = {};
    }
  }

  return translations;
}

/**
 * Handle locale change in actions
 */
export async function changeLocale(
  request: ActionFunctionArgs["request"]
): Promise<{ locale: Locale; cookieHeader: string }> {
  const formData = await request.formData();
  const newLocale = formData.get("locale") as string;

  if (!isSupportedLocale(newLocale)) {
    throw new Response("Invalid locale", { status: 400 });
  }

  const cookieHeader = setLocaleCookie(newLocale as Locale);

  return {
    locale: newLocale as Locale,
    cookieHeader,
  };
}
