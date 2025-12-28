import type { Locale } from "./i18n.config";

export type CurrencyCode = "VND" | "USD" | "EUR" | "GBP" | "JPY" | "SGD";

/**
 * Currency formatting options
 */
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
 * Vietnamese VND formatting:
 * - Uses dot (.) as thousands separator: 1.234.560 ₫
 * - No decimal places
 * - Negative values shown in parentheses: (1.234.560 ₫)
 *
 * English USD formatting:
 * - Uses comma (,) as thousands separator: $1,234.56
 * - Two decimal places
 * - Negative values with minus sign: -$1,234.56
 *
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string
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
  const localeConfig = getCurrencyLocale(currency, locale);

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

  // Remove currency symbol if requested
  if (!symbol && formatted.includes(currency)) {
    formatted = formatted.replace(new RegExp(`\\s?\\${currency}[\\w\\s]*$`, "i"), "").trim();
  }

  return formatted;
}

/**
 * Format Vietnamese Dong with dot separators
 * Ensures proper formatting even when locale is not Vietnamese
 */
export function formatVND(
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

  // Format with dot separator for thousands
  let formatted: string;

  if (compact && absAmount >= 1_000_000_000) {
    // Compact: billions
    formatted = `${(absAmount / 1_000_000_000).toFixed(1)} tỷ`;
  } else if (compact && absAmount >= 1_000_000) {
    // Compact: millions
    formatted = `${(absAmount / 1_000_000).toFixed(1)} triệu`;
  } else if (compact && absAmount >= 1_000) {
    // Compact: thousands
    formatted = `${(absAmount / 1_000).toFixed(1)} nghìn`;
  } else {
    // Standard formatting with dot separators
    formatted = absAmount
      .toFixed(decimals)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      .replace(/,/g, ".");
  }

  // Add currency symbol
  if (symbol) {
    formatted = `${formatted} ₫`;
  }

  // Handle negative values
  if (isNegative) {
    if (locale === "vi" && signDisplay === "auto") {
      // Vietnamese uses parentheses for negative amounts
      formatted = `(${formatted})`;
    } else if (signDisplay === "auto") {
      formatted = `-${formatted}`;
    }
  }

  // Handle signDisplay options
  if (signDisplay === "always" && !isNegative) {
    formatted = `+${formatted}`;
  }

  return formatted;
}

/**
 * Format USD with comma separators
 */
export function formatUSD(
  amount: number,
  options: {
    signDisplay?: "always" | "exceptZero" | "never" | "auto";
    compact?: boolean;
    decimals?: number;
    symbol?: boolean;
  } = {}
): string {
  const { signDisplay = "auto", decimals = 2, symbol = true } = options;

  const formatter = new Intl.NumberFormat("en-US", {
    style: symbol ? "currency" : "decimal",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay,
  });

  return formatter.format(amount);
}

/**
 * Get locale configuration for a specific currency
 */
function getCurrencyLocale(
  currency: CurrencyCode,
  userLocale: Locale
): {
  locale: string;
  minimumFractionDigits: number;
  maximumFractionDigits: number;
} {
  const currencyConfigs: Record<
    CurrencyCode,
    { locale: string; minDecimals: number; maxDecimals: number }
  > = {
    VND: { locale: "vi-VN", minDecimals: 0, maxDecimals: 0 },
    USD: { locale: "en-US", minDecimals: 2, maxDecimals: 2 },
    EUR: { locale: "de-DE", minDecimals: 2, maxDecimals: 2 },
    GBP: { locale: "en-GB", minDecimals: 2, maxDecimals: 2 },
    JPY: { locale: "ja-JP", minDecimals: 0, maxDecimals: 0 },
    SGD: { locale: "en-SG", minDecimals: 2, maxDecimals: 2 },
  };

  const config = currencyConfigs[currency] || currencyConfigs.USD;

  return {
    locale: config.locale,
    minimumFractionDigits: config.minDecimals,
    maximumFractionDigits: config.maxDecimals,
  };
}

/**
 * Parse currency string back to number
 */
export function parseCurrency(value: string, locale: Locale = "en"): number {
  // Remove currency symbols and whitespace
  let cleaned = value
    .replace(/[^\d.,\-()]/g, "")
    .trim();

  // Handle Vietnamese negative format (parentheses)
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    cleaned = `-${cleaned.slice(1, -1)}`;
  }

  // Remove locale-specific formatting
  if (locale === "vi") {
    // Vietnamese: dot as thousands separator
    cleaned = cleaned.replace(/\./g, "").replace(/,/g, ".");
  } else {
    // English: comma as thousands separator
    cleaned = cleaned.replace(/,/g, "");
  }

  return parseFloat(cleaned) || 0;
}

/**
 * Format currency range
 */
export function formatCurrencyRange(
  min: number,
  max: number,
  options: CurrencyFormatOptions = {}
): string {
  const formattedMin = formatCurrency(min, options);
  const formattedMax = formatCurrency(max, options);

  return `${formattedMin} - ${formattedMax}`;
}

/**
 * Format currency change/difference
 */
export function formatCurrencyChange(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  return formatCurrency(amount, {
    ...options,
    signDisplay: "always",
  });
}

/**
 * Format percentage for financial data
 */
export function formatPercentage(
  value: number,
  locale: Locale = "en",
  decimals: number = 2
): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: "always",
  }).format(value / 100);
}

/**
 * Format compact currency (e.g., 1.2M, 3.4B)
 */
export function formatCompactCurrency(
  amount: number,
  currency: CurrencyCode = "VND",
  locale: Locale = "en"
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    notation: "compact",
    compactDisplay: "short",
  });

  return formatter.format(amount);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: CurrencyCode): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  });

  const parts = formatter.formatToParts(1);
  const symbolPart = parts.find((part) => part.type === "currency");

  return symbolPart?.value || currency;
}

/**
 * Check if amount is negative based on locale formatting
 */
export function isNegativeCurrency(value: string, locale: Locale = "en"): boolean {
  // Check for minus sign
  if (value.startsWith("-")) return true;

  // Check for Vietnamese parentheses format
  if (locale === "vi" && value.startsWith("(") && value.endsWith(")")) {
    return true;
  }

  return false;
}

/**
 * Format multiple currencies for comparison
 */
export function formatMultiCurrency(
  amounts: { amount: number; currency: CurrencyCode }[],
  locale: Locale = "en"
): string[] {
  return amounts.map(({ amount, currency }) =>
    formatCurrency(amount, { locale, currency })
  );
}

/**
 * Calculate and format currency exchange
 */
export function formatExchange(
  amount: number,
  fromCurrency: CurrencyCode,
  toCurrency: CurrencyCode,
  rate: number,
  locale: Locale = "en"
): {
  original: string;
  converted: string;
  rate: string;
} {
  const convertedAmount = amount * rate;

  return {
    original: formatCurrency(amount, { locale, currency: fromCurrency }),
    converted: formatCurrency(convertedAmount, { locale, currency: toCurrency }),
    rate: `1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`,
  };
}
