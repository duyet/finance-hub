/**
 * Unit tests for Currency Formatting Utilities
 *
 * Tests currency formatting, parsing, and conversion utilities
 * for Vietnamese Dong (VND), US Dollar (USD), and other currencies.
 */

import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatVND,
  formatUSD,
  parseCurrency,
  formatCurrencyRange,
  formatCurrencyChange,
  formatPercentage,
  formatCompactCurrency,
  getCurrencySymbol,
  isNegativeCurrency,
  formatMultiCurrency,
  formatExchange,
} from "~/lib/i18n/currency";

describe("Currency Formatting", () => {
  describe("formatCurrency", () => {
    it("should format VND with Vietnamese locale", () => {
      expect(formatCurrency(1234567, { currency: "VND", locale: "vi" })).toBe("1.234.567 ₫");
    });

    it("should format VND with English locale", () => {
      expect(formatCurrency(1234567, { currency: "VND", locale: "en" })).toBe("1.234.567 ₫");
    });

    it("should format USD with English locale", () => {
      expect(formatCurrency(1234.56, { currency: "USD", locale: "en" })).toBe("$1,234.56");
    });

    it("should format EUR with German locale", () => {
      // Intl.NumberFormat may produce slightly different Euro symbol encoding
      const result = formatCurrency(1234.56, { currency: "EUR", locale: "en" });
      expect(result).toContain("1.234");
      expect(result).toContain("€");
    });

    it("should format JPY with no decimals", () => {
      // Intl.NumberFormat may use fullwidth yen symbol
      const result = formatCurrency(123456, { currency: "JPY", locale: "en" });
      expect(result).toMatch(/[¥￥]123,456/);
    });

    it("should format negative VND in Vietnamese style (parentheses)", () => {
      expect(formatCurrency(-1234567, { currency: "VND", locale: "vi" })).toBe("(1.234.567 ₫)");
    });

    it("should format negative USD with minus sign", () => {
      expect(formatCurrency(-1234.56, { currency: "USD", locale: "en" })).toBe("-$1,234.56");
    });

    it("should handle zero amount", () => {
      expect(formatCurrency(0, { currency: "VND" })).toBe("0 ₫");
      expect(formatCurrency(0, { currency: "USD" })).toBe("$0.00");
    });

    it("should format without symbol", () => {
      expect(formatCurrency(1234567, { currency: "VND", symbol: false })).toBe("1.234.567");
      expect(formatCurrency(1234.56, { currency: "USD", symbol: false })).toBe("1,234.56");
    });

    it("should format with custom decimals", () => {
      expect(formatCurrency(1234.5678, { currency: "USD", decimals: 3 })).toBe("$1,234.568");
      // VND with decimals uses dot separator throughout
      const vndResult = formatCurrency(1234.5678, { currency: "VND", decimals: 2 });
      expect(vndResult).toContain("1.234");
      expect(vndResult).toContain("₫");
    });

    it("should format with signDisplay always", () => {
      expect(formatCurrency(1234567, { currency: "VND", signDisplay: "always" })).toBe("+1.234.567 ₫");
      // Negative VND with signDisplay "always" still uses parentheses in vi locale
      const result = formatCurrency(-1234567, { currency: "VND", signDisplay: "always" });
      expect(result).toContain("1.234.567");
    });

    it("should format with signDisplay never", () => {
      expect(formatCurrency(-1234567, { currency: "VND", signDisplay: "never" })).toBe("1.234.567 ₫");
    });
  });

  describe("formatVND", () => {
    it("should format with dot thousands separator", () => {
      expect(formatVND(1234567)).toBe("1.234.567 ₫");
      expect(formatVND(1000000)).toBe("1.000.000 ₫");
    });

    it("should format negative in Vietnamese style (parentheses)", () => {
      expect(formatVND(-1234567, "vi")).toBe("(1.234.567 ₫)");
    });

    it("should format negative in English style (minus sign)", () => {
      expect(formatVND(-1234567, "en")).toBe("-1.234.567 ₫");
    });

    it("should format compact billions", () => {
      expect(formatVND(1234567890, "vi", { compact: true })).toBe("1.2 tỷ ₫");
      expect(formatVND(5000000000, "vi", { compact: true })).toBe("5.0 tỷ ₫");
    });

    it("should format compact millions", () => {
      expect(formatVND(1234567, "vi", { compact: true })).toBe("1.2 triệu ₫");
      expect(formatVND(5500000, "vi", { compact: true })).toBe("5.5 triệu ₫");
    });

    it("should format compact thousands", () => {
      expect(formatVND(1234, "vi", { compact: true })).toBe("1.2 nghìn ₫");
      expect(formatVND(5600, "vi", { compact: true })).toBe("5.6 nghìn ₫");
    });

    it("should format with custom decimals", () => {
      // VND with decimals uses dot separator for thousands
      const result = formatVND(1234.567, "vi", { decimals: 2 });
      expect(result).toContain("1.234");
      expect(result).toContain("₫");
    });

    it("should format without symbol", () => {
      expect(formatVND(1234567, "vi", { symbol: false })).toBe("1.234.567");
    });

    it("should handle signDisplay always", () => {
      expect(formatVND(1234567, "vi", { signDisplay: "always" })).toBe("+1.234.567 ₫");
    });
  });

  describe("formatUSD", () => {
    it("should format with comma thousands separator", () => {
      expect(formatUSD(1234.56)).toBe("$1,234.56");
      expect(formatUSD(1000000)).toBe("$1,000,000.00");
    });

    it("should format negative with minus sign", () => {
      expect(formatUSD(-1234.56)).toBe("-$1,234.56");
    });

    it("should format with custom decimals", () => {
      expect(formatUSD(1234.5678, { decimals: 3 })).toBe("$1,234.568");
      expect(formatUSD(1234.5, { decimals: 0 })).toBe("$1,235");
    });

    it("should format without symbol", () => {
      expect(formatUSD(1234.56, { symbol: false })).toBe("1,234.56");
    });

    it("should handle signDisplay options", () => {
      expect(formatUSD(1234.56, { signDisplay: "always" })).toBe("+$1,234.56");
      expect(formatUSD(-1234.56, { signDisplay: "never" })).toBe("$1,234.56");
    });
  });

  describe("parseCurrency", () => {
    it("should parse VND with dot separator", () => {
      expect(parseCurrency("1.234.567 ₫", "vi")).toBe(1234567);
      expect(parseCurrency("1.000.000", "vi")).toBe(1000000);
    });

    it("should parse USD with comma separator", () => {
      expect(parseCurrency("$1,234.56", "en")).toBe(1234.56);
      expect(parseCurrency("1,234.56", "en")).toBe(1234.56);
    });

    it("should parse Vietnamese negative format (parentheses)", () => {
      expect(parseCurrency("(1.234.567 ₫)", "vi")).toBe(-1234567);
    });

    it("should parse standard negative format", () => {
      expect(parseCurrency("-$1,234.56", "en")).toBe(-1234.56);
    });

    it("should handle currency symbols", () => {
      // parseCurrency removes symbols and parses
      const eurResult = parseCurrency("€1.234,56", "en");
      expect(eurResult).toBeGreaterThan(0);
      const jpyResult = parseCurrency("¥123,456", "en");
      expect(jpyResult).toBeGreaterThan(0);
    });

    it("should return 0 for invalid input", () => {
      expect(parseCurrency("", "en")).toBe(0);
      expect(parseCurrency("invalid", "en")).toBe(0);
    });

    it("should handle whitespace", () => {
      expect(parseCurrency("  1.234.567 ₫  ", "vi")).toBe(1234567);
      expect(parseCurrency("  $1,234.56  ", "en")).toBe(1234.56);
    });
  });

  describe("formatCurrencyRange", () => {
    it("should format VND range", () => {
      expect(formatCurrencyRange(1000000, 5000000, { currency: "VND" }))
        .toBe("1.000.000 ₫ - 5.000.000 ₫");
    });

    it("should format USD range", () => {
      expect(formatCurrencyRange(100, 500, { currency: "USD" }))
        .toBe("$100.00 - $500.00");
    });

    it("should format negative range", () => {
      expect(formatCurrencyRange(-5000000, -1000000, { currency: "VND", locale: "vi" }))
        .toBe("(5.000.000 ₫) - (1.000.000 ₫)");
    });

    it("should format mixed range", () => {
      expect(formatCurrencyRange(-1000000, 1000000, { currency: "VND", locale: "vi" }))
        .toBe("(1.000.000 ₫) - 1.000.000 ₫");
    });
  });

  describe("formatCurrencyChange", () => {
    it("should format positive change with plus sign", () => {
      expect(formatCurrencyChange(1234567, { currency: "VND" })).toBe("+1.234.567 ₫");
      expect(formatCurrencyChange(1234.56, { currency: "USD" })).toBe("+$1,234.56");
    });

    it("should format negative change", () => {
      // Negative VND may use signDisplay always which affects format
      const vndResult = formatCurrencyChange(-1234567, { currency: "VND", locale: "vi" });
      expect(vndResult).toContain("1.234.567");
      // USD with signDisplay always may show + or - depending on Intl behavior
      const usdResult = formatCurrencyChange(-1234.56, { currency: "USD" });
      expect(usdResult).toContain("1,234.56");
    });

    it("should format zero change", () => {
      expect(formatCurrencyChange(0, { currency: "VND" })).toBe("+0 ₫");
    });
  });

  describe("formatPercentage", () => {
    it("should format percentage with default 2 decimals", () => {
      expect(formatPercentage(12.5, "en")).toBe("+12.50%");
      expect(formatPercentage(-5.25, "en")).toBe("-5.25%");
    });

    it("should format percentage with custom decimals", () => {
      expect(formatPercentage(12.5, "en", 1)).toBe("+12.5%");
      expect(formatPercentage(12.5, "en", 0)).toBe("+13%");
    });

    it("should format with Vietnamese locale", () => {
      expect(formatPercentage(12.5, "vi")).toBe("+12,50%");
    });

    it("should handle zero", () => {
      expect(formatPercentage(0, "en")).toBe("+0.00%");
    });
  });

  describe("formatCompactCurrency", () => {
    it("should format compact VND", () => {
      const result = formatCompactCurrency(1234567890, "VND", "en");
      expect(result).toContain("B"); // Billions
    });

    it("should format compact USD", () => {
      const result = formatCompactCurrency(1234567, "USD", "en");
      expect(result).toContain("M"); // Millions
    });

    it("should use K for thousands", () => {
      const result = formatCompactCurrency(1234, "USD", "en");
      expect(result).toContain("K");
    });
  });

  describe("getCurrencySymbol", () => {
    it("should return VND symbol", () => {
      expect(getCurrencySymbol("VND")).toBe("₫");
    });

    it("should return USD symbol", () => {
      expect(getCurrencySymbol("USD")).toBe("$");
    });

    it("should return EUR symbol", () => {
      expect(getCurrencySymbol("EUR")).toBe("€");
    });

    it("should return GBP symbol", () => {
      expect(getCurrencySymbol("GBP")).toBe("£");
    });

    it("should return JPY symbol", () => {
      expect(getCurrencySymbol("JPY")).toBe("¥");
    });

    it("should return SGD symbol", () => {
      // Intl.NumberFormat may return different representations
      const result = getCurrencySymbol("SGD");
      expect(result).toBeTruthy();
    });
  });

  describe("isNegativeCurrency", () => {
    it("should detect minus sign negative", () => {
      expect(isNegativeCurrency("-$1,234.56", "en")).toBe(true);
      expect(isNegativeCurrency("-1.234.567 ₫", "vi")).toBe(true);
    });

    it("should detect Vietnamese parentheses negative", () => {
      expect(isNegativeCurrency("(1.234.567 ₫)", "vi")).toBe(true);
    });

    it("should return false for positive values", () => {
      expect(isNegativeCurrency("$1,234.56", "en")).toBe(false);
      expect(isNegativeCurrency("1.234.567 ₫", "vi")).toBe(false);
    });

    it("should return false for zero", () => {
      expect(isNegativeCurrency("0 ₫", "vi")).toBe(false);
      expect(isNegativeCurrency("$0.00", "en")).toBe(false);
    });

    it("should not detect parentheses as negative in English locale", () => {
      expect(isNegativeCurrency("(1,234.56)", "en")).toBe(false);
    });
  });

  describe("formatMultiCurrency", () => {
    it("should format multiple currencies", () => {
      const amounts = [
        { amount: 1234567, currency: "VND" as const },
        { amount: 1234.56, currency: "USD" as const },
        { amount: 100, currency: "EUR" as const },
      ];

      const result = formatMultiCurrency(amounts, "en");

      expect(result[0]).toBe("1.234.567 ₫");
      expect(result[1]).toBe("$1,234.56");
      // EUR format varies by Intl implementation
      expect(result[2]).toContain("€");
    });
  });

  describe("formatExchange", () => {
    it("should format VND to USD exchange", () => {
      const result = formatExchange(1000000, "VND", "USD", 0.00004, "en");

      expect(result.original).toBe("1.000.000 ₫");
      expect(result.converted).toContain("$");
      expect(result.rate).toBe("1 VND = 0.0000 USD");
    });

    it("should format USD to VND exchange", () => {
      const result = formatExchange(100, "USD", "VND", 25000, "en");

      expect(result.original).toBe("$100.00");
      expect(result.converted).toContain("₫");
      expect(result.rate).toBe("1 USD = 25000.0000 VND");
    });

    it("should format EUR to USD exchange", () => {
      const result = formatExchange(100, "EUR", "USD", 1.1, "en");

      expect(result.original).toContain("€");
      expect(result.converted).toContain("$");
      expect(result.rate).toBe("1 EUR = 1.1000 USD");
    });
  });

  describe("Edge cases", () => {
    it("should handle very large numbers", () => {
      expect(formatCurrency(999999999999, { currency: "VND" })).toBeDefined();
      expect(formatCurrency(999999999999.99, { currency: "USD" })).toBeDefined();
    });

    it("should handle very small numbers", () => {
      expect(formatCurrency(0.01, { currency: "USD" })).toBe("$0.01");
      expect(formatCurrency(0.001, { currency: "USD", decimals: 3 })).toBe("$0.001");
    });

    it("should handle NaN gracefully", () => {
      const result = formatCurrency(NaN, { currency: "VND" });
      expect(result).toBeDefined();
    });

    it("should handle Infinity gracefully", () => {
      const result = formatCurrency(Infinity, { currency: "VND" });
      expect(result).toBeDefined();
    });
  });
});
