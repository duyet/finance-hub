/**
 * Unit tests for Currency Formatting
 *
 * Tests the formatCurrency function for Vietnamese Dong (VND)
 * and other currencies with proper locale-aware formatting.
 */

import { describe, it, expect } from "vitest";
import { formatCurrency } from "~/lib/i18n/currency";

describe("formatCurrency", () => {
  describe("VND formatting", () => {
    it("should format VND with Vietnamese locale", () => {
      expect(formatCurrency(1234567, { currency: "VND", locale: "vi" })).toBe("1.234.567 ₫");
    });

    it("should format VND with English locale", () => {
      expect(formatCurrency(1234567, { currency: "VND", locale: "en" })).toBe("1.234.567 ₫");
    });

    it("should format negative VND in Vietnamese style (parentheses)", () => {
      expect(formatCurrency(-1234567, { currency: "VND", locale: "vi" })).toBe("(1.234.567 ₫)");
    });

    it("should format negative VND in English style (minus)", () => {
      expect(formatCurrency(-1234567, { currency: "VND", locale: "en" })).toBe("-1.234.567 ₫");
    });

    it("should handle zero amount", () => {
      expect(formatCurrency(0, { currency: "VND" })).toBe("0 ₫");
    });

    it("should format without symbol", () => {
      expect(formatCurrency(1234567, { currency: "VND", symbol: false })).toBe("1.234.567");
    });

    it("should format compact billions", () => {
      expect(formatCurrency(1234567890, { currency: "VND", locale: "vi", compact: true })).toBe("1.2 tỷ ₫");
    });

    it("should format compact millions", () => {
      expect(formatCurrency(1234567, { currency: "VND", locale: "vi", compact: true })).toBe("1.2 triệu ₫");
    });

    it("should format compact thousands", () => {
      expect(formatCurrency(1234, { currency: "VND", locale: "vi", compact: true })).toBe("1.2 nghìn ₫");
    });

    it("should format with signDisplay always", () => {
      expect(formatCurrency(1234567, { currency: "VND", signDisplay: "always" })).toBe("+1.234.567 ₫");
    });

    it("should format with signDisplay never", () => {
      expect(formatCurrency(-1234567, { currency: "VND", signDisplay: "never" })).toBe("1.234.567 ₫");
    });
  });

  describe("USD formatting", () => {
    it("should format USD with English locale", () => {
      expect(formatCurrency(1234.56, { currency: "USD", locale: "en" })).toBe("$1,234.56");
    });

    it("should format negative USD with minus sign", () => {
      expect(formatCurrency(-1234.56, { currency: "USD", locale: "en" })).toBe("-$1,234.56");
    });

    it("should handle zero amount", () => {
      expect(formatCurrency(0, { currency: "USD" })).toBe("$0.00");
    });

    it("should format without symbol", () => {
      expect(formatCurrency(1234.56, { currency: "USD", symbol: false })).toBe("1,234.56");
    });

    it("should format with custom decimals", () => {
      expect(formatCurrency(1234.5678, { currency: "USD", decimals: 3 })).toBe("$1,234.568");
    });
  });

  describe("Other currencies", () => {
    it("should format EUR", () => {
      const result = formatCurrency(1234.56, { currency: "EUR", locale: "en" });
      expect(result).toContain("1.234");
      expect(result).toContain("€");
    });

    it("should format JPY with no decimals", () => {
      const result = formatCurrency(123456, { currency: "JPY", locale: "en" });
      expect(result).toMatch(/[¥￥]123,456/);
    });

    it("should format GBP", () => {
      const result = formatCurrency(1234.56, { currency: "GBP", locale: "en" });
      expect(result).toContain("£");
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
