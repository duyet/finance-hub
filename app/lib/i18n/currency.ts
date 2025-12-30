/**
 * Currency formatting utilities
 *
 * Handles Vietnamese VND (dot separator) and other currencies via Intl API.
 */

import type { Locale } from "./i18n.config";

export type CurrencyCode = "VND" | "USD" | "EUR" | "GBP" | "JPY" | "SGD";

export interface CurrencyFormatOptions {
  locale?: Locale;
  currency?: CurrencyCode;
  signDisplay?: "always" | "exceptZero" | "never" | "auto";
  compact?: boolean;
  decimals?: number;
  symbol?: boolean;
}

/**
 * Format currency with Vietnamese and English conventions
 *
 * Vietnamese VND: 1.234.560 ₫ (dot separator, no decimals, parentheses for negative)
 * English USD: $1,234.56 (comma separator, 2 decimals, minus for negative)
 */
export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    locale = "en",
    currency = "VND",
    signDisplay = "auto",
    compact = false,
    decimals,
    symbol = true,
  } = options;

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  // Vietnamese VND with dot separators
  if (currency === "VND") {
    return formatVND(amount, locale, { signDisplay, compact, decimals, symbol });
  }

  // Other currencies using Intl
  const localeConfig = getCurrencyLocale(currency);

  const formatter = new Intl.NumberFormat(localeConfig.locale, {
    style: symbol ? "currency" : "decimal",
    currency: currency,
    minimumFractionDigits: decimals !== undefined ? decimals : localeConfig.minimumFractionDigits,
    maximumFractionDigits: decimals !== undefined ? decimals : localeConfig.maximumFractionDigits,
    signDisplay,
  });

  let formatted = formatter.format(absAmount);

  // Apply sign for negative amounts when not using signDisplay
  if (isNegative && signDisplay === "auto") {
    formatted = `-${formatted}`;
  }

  return formatted;
}

/**
 * Format Vietnamese Dong with dot separators
 */
function formatVND(
  amount: number,
  locale: Locale = "vi",
  options: {
    signDisplay?: "always" | "exceptZero" | "never" | "auto";
    compact?: boolean;
    decimals?: number;
    symbol?: boolean;
  } = {}
): string {
  const { signDisplay = "auto", compact = false, decimals = 0, symbol = true } = options;

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formatted: string;

  if (compact && absAmount >= 1_000_000_000) {
    formatted = `${(absAmount / 1_000_000_000).toFixed(1)} tỷ`;
  } else if (compact && absAmount >= 1_000_000) {
    formatted = `${(absAmount / 1_000_000).toFixed(1)} triệu`;
  } else if (compact && absAmount >= 1_000) {
    formatted = `${(absAmount / 1_000).toFixed(1)} nghìn`;
  } else {
    formatted = absAmount
      .toFixed(decimals)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      .replace(/,/g, ".");
  }

  if (symbol) {
    formatted = `${formatted} ₫`;
  }

  if (isNegative) {
    if (locale === "vi" && signDisplay === "auto") {
      formatted = `(${formatted})`;
    } else if (signDisplay === "auto") {
      formatted = `-${formatted}`;
    }
  }

  if (signDisplay === "always" && !isNegative) {
    formatted = `+${formatted}`;
  }

  return formatted;
}

/**
 * Get locale configuration for a specific currency
 */
function getCurrencyLocale(currency: CurrencyCode): {
  locale: string;
  minimumFractionDigits: number;
  maximumFractionDigits: number;
} {
  const configs: Record<CurrencyCode, { locale: string; minDecimals: number; maxDecimals: number }> = {
    VND: { locale: "vi-VN", minDecimals: 0, maxDecimals: 0 },
    USD: { locale: "en-US", minDecimals: 2, maxDecimals: 2 },
    EUR: { locale: "de-DE", minDecimals: 2, maxDecimals: 2 },
    GBP: { locale: "en-GB", minDecimals: 2, maxDecimals: 2 },
    JPY: { locale: "ja-JP", minDecimals: 0, maxDecimals: 0 },
    SGD: { locale: "en-SG", minDecimals: 2, maxDecimals: 2 },
  };

  const config = configs[currency] || configs.USD;

  return {
    locale: config.locale,
    minimumFractionDigits: config.minDecimals,
    maximumFractionDigits: config.maxDecimals,
  };
}
