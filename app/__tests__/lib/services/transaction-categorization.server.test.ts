/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for Transaction Categorization Service
 *
 * Tests pattern-based categorization, cosine similarity calculations,
 * and utility functions for auto-categorizing bank transactions.
 */

import { describe, it, expect } from "vitest";
import {
  categorizeByPattern,
  getCategorizationSuggestions,
  cosineSimilarity,
} from "~/lib/services/transaction-categorization.server";

describe("Transaction Categorization Service", () => {
  describe("categorizeByPattern", () => {
    it("should categorize ride-sharing transactions", () => {
      expect(categorizeByPattern("Grab ride to airport", -50000)).toBe("Transport");
      expect(categorizeByPattern("Uber trip", -150000)).toBe("Transport");
      expect(categorizeByPattern("Be bike ride", -20000)).toBe("Transport");
      expect(categorizeByPattern("Gojek ride", -80000)).toBe("Transport");
    });

    it("should categorize gas/petrol transactions", () => {
      expect(categorizeByPattern("Petrol station refill", -500000)).toBe("Transport");
      expect(categorizeByPattern("Xang dap", -200000)).toBe("Transport");
      expect(categorizeByPattern("Dau nhien lieu", -450000)).toBe("Transport");
      expect(categorizeByPattern("Shell station", -600000)).toBe("Transport");
      expect(categorizeByPattern("PVOil", -550000)).toBe("Transport");
    });

    it("should categorize coffee shop transactions", () => {
      expect(categorizeByPattern("Highlands Coffee", -45000)).toBe("Food & Drink");
      expect(categorizeByPattern("The Coffee House", -55000)).toBe("Food & Drink");
      expect(categorizeByPattern("Phê La", -60000)).toBe("Food & Drink");
      expect(categorizeByPattern("Cà phê sữa đá", -35000)).toBe("Food & Drink");
    });

    it("should categorize food delivery transactions", () => {
      expect(categorizeByPattern("ShopeeFood order", -120000)).toBe("Food & Drink");
      expect(categorizeByPattern("GrabFood delivery", -95000)).toBe("Food & Drink");
      expect(categorizeByPattern("Be Food", -85000)).toBe("Food & Drink");
      expect(categorizeByPattern("Food delivery", -100000)).toBe("Food & Drink");
    });

    it("should categorize e-commerce transactions", () => {
      expect(categorizeByPattern("Shopee purchase", -250000)).toBe("Shopping");
      expect(categorizeByPattern("Lazada order", -350000)).toBe("Shopping");
      expect(categorizeByPattern("Tiki shopping", -450000)).toBe("Shopping");
      expect(categorizeByPattern("TikTok Shop", -200000)).toBe("Shopping");
      expect(categorizeByPattern("TGDD", -5000000)).toBe("Shopping");
    });

    it("should categorize entertainment subscriptions", () => {
      expect(categorizeByPattern("Netflix subscription", -250000)).toBe("Entertainment");
      expect(categorizeByPattern("YouTube Premium", -70000)).toBe("Entertainment");
      expect(categorizeByPattern("Spotify", -70000)).toBe("Entertainment");
      expect(categorizeByPattern("Apple Music", -99000)).toBe("Entertainment");
      expect(categorizeByPattern("TikTok ads", -500000)).toBe("Entertainment");
    });

    it("should categorize gaming transactions", () => {
      expect(categorizeByPattern("Steam game purchase", -500000)).toBe("Entertainment");
      expect(categorizeByPattern("PlayStation Store", -800000)).toBe("Entertainment");
      expect(categorizeByPattern("Xbox Game Pass", -250000)).toBe("Entertainment");
      expect(categorizeByPattern("Nintendo eShop", -600000)).toBe("Entertainment");
      expect(categorizeByPattern("App Store purchase", -99000)).toBe("Entertainment");
    });

    it("should categorize utility bill payments", () => {
      expect(categorizeByPattern("EVN electricity bill", -500000)).toBe("Bills & Utilities");
      expect(categorizeByPattern("Điện tiền", -450000)).toBe("Bills & Utilities");
      expect(categorizeByPattern("Water supply", -150000)).toBe("Bills & Utilities");
      expect(categorizeByPattern("Nước tiền", -120000)).toBe("Bills & Utilities");
      expect(categorizeByPattern("FPT internet", -250000)).toBe("Bills & Utilities");
    });

    it("should categorize mobile phone top-ups", () => {
      expect(categorizeByPattern("Viettel topup", -100000)).toBe("Bills & Utilities");
      expect(categorizeByPattern("Mobile nạp tiền", -50000)).toBe("Bills & Utilities");
      expect(categorizeByPattern("Phone recharge", -200000)).toBe("Bills & Utilities");
    });

    it("should categorize healthcare transactions", () => {
      expect(categorizeByPattern("Hospital payment", -2000000)).toBe("Health");
      expect(categorizeByPattern("Bệnh viện", -1500000)).toBe("Health");
      expect(categorizeByPattern("Pharmacy", -250000)).toBe("Health");
      expect(categorizeByPattern("Nhà thuốc", -300000)).toBe("Health");
      expect(categorizeByPattern("Doctor visit", -500000)).toBe("Health");
      expect(categorizeByPattern("Gym membership", -800000)).toBe("Health");
    });

    it("should categorize education expenses", () => {
      expect(categorizeByPattern("University tuition", -5000000)).toBe("Education");
      expect(categorizeByPattern("Học phí", -3000000)).toBe("Education");
      expect(categorizeByPattern("Course purchase", -999000)).toBe("Education");
      expect(categorizeByPattern("IELTS exam", -5000000)).toBe("Education");
      expect(categorizeByPattern("Book store", -250000)).toBe("Education");
    });

    it("should categorize housing expenses", () => {
      expect(categorizeByPattern("Rent payment", -5000000)).toBe("Housing");
      expect(categorizeByPattern("Thuê nhà", -4500000)).toBe("Housing");
      expect(categorizeByPattern("Elevator fee", -200000)).toBe("Housing");
      expect(categorizeByPattern("Thang máy", -150000)).toBe("Housing");
      expect(categorizeByPattern("Household cleaning", -500000)).toBe("Housing");
    });

    it("should categorize income transactions", () => {
      expect(categorizeByPattern("Lương tháng 12", 15000000)).toBe("Salary");
      expect(categorizeByPattern("Salary payment", 20000000)).toBe("Salary");
      expect(categorizeByPattern("Thưởng quý", 5000000)).toBe("Salary");
      expect(categorizeByPattern("Bonus payment", 3000000)).toBe("Salary");
      expect(categorizeByPattern("Freelance project", 10000000)).toBe("Freelance");
      expect(categorizeByPattern("Contract income", 15000000)).toBe("Freelance");
    });

    it("should categorize refund transactions", () => {
      expect(categorizeByPattern("Refund for order", 500000)).toBe("Refund");
      expect(categorizeByPattern("Hoàn tiền", 300000)).toBe("Refund");
    });

    it("should categorize investment income", () => {
      expect(categorizeByPattern("Dividend payment", 2000000)).toBe("Investment Income");
      expect(categorizeByPattern("Lãi suất", 500000)).toBe("Investment Income");
      expect(categorizeByPattern("Interest earned", 1000000)).toBe("Investment Income");
      expect(categorizeByPattern("Cổ tức", 3000000)).toBe("Investment Income");
    });

    it("should categorize bank charges", () => {
      expect(categorizeByPattern("Bank fee", -3300)).toBe("Bank Charges");
      expect(categorizeByPattern("Phí dịch vụ", -5000)).toBe("Bank Charges");
      expect(categorizeByPattern("ATM withdrawal", -2000000)).toBe("Cash Withdrawal");
      expect(categorizeByPattern("Rút tiền", -3000000)).toBe("Cash Withdrawal");
    });

    it("should categorize travel expenses", () => {
      expect(categorizeByPattern("Hotel booking", -2000000)).toBe("Travel");
      expect(categorizeByPattern("Khách sạn", -1500000)).toBe("Travel");
      expect(categorizeByPattern("Flight ticket", -3000000)).toBe("Travel");
      expect(categorizeByPattern("Vietjet Air", -1500000)).toBe("Travel");
      expect(categorizeByPattern("Bamboo Airways", -2000000)).toBe("Travel");
      expect(categorizeByPattern("Visa fee", -3000000)).toBe("Travel");
    });

    it("should handle null or empty content", () => {
      expect(categorizeByPattern("", -100000)).toBeNull();
      expect(categorizeByPattern(null as any, -100000)).toBeNull();
      expect(categorizeByPattern(undefined as any, -100000)).toBeNull();
    });

    it("should handle case-insensitive matching", () => {
      expect(categorizeByPattern("GRAB RIDE", -50000)).toBe("Transport");
      expect(categorizeByPattern("Coffee Shop", -45000)).toBe("Food & Drink");
      expect(categorizeByPattern("NETFLIX", -250000)).toBe("Entertainment");
    });
  });

  describe("getCategorizationSuggestions", () => {
    it("should return multiple category suggestions for ambiguous content", () => {
      const suggestions = getCategorizationSuggestions("Coffee at Starbucks", -50000);
      expect(suggestions).toContain("Food & Drink");
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it("should return unique suggestions", () => {
      const suggestions = getCategorizationSuggestions("Grab ride and GrabFood", -100000);
      const uniqueSuggestions = [...new Set(suggestions)];
      expect(suggestions).toEqual(uniqueSuggestions);
    });

    it("should return empty array for content with no matches", () => {
      const suggestions = getCategorizationSuggestions("Unknown transaction XYZ123", -100000);
      expect(suggestions).toEqual([]);
    });

    it("should prioritize higher priority rules", () => {
      const suggestions = getCategorizationSuggestions("Grab ride", -50000);
      expect(suggestions[0]).toBe("Transport");
    });
  });

  describe("cosineSimilarity", () => {
    it("should calculate cosine similarity correctly", () => {
      const vectorA = [1, 2, 3];
      const vectorB = [4, 5, 6];

      const similarity = cosineSimilarity(vectorA, vectorB);

      // Expected: (1*4 + 2*5 + 3*6) / (sqrt(1+4+9) * sqrt(16+25+36))
      // = (4 + 10 + 18) / (sqrt(14) * sqrt(77))
      // = 32 / (3.7417 * 8.7750)
      // = 32 / 32.8356
      // ≈ 0.9746
      expect(similarity).toBeCloseTo(0.9746, 4);
    });

    it("should return 1 for identical vectors", () => {
      const vector = [1, 2, 3, 4];
      expect(cosineSimilarity(vector, vector)).toBe(1);
    });

    it("should return 0 for orthogonal vectors", () => {
      const vectorA = [1, 0];
      const vectorB = [0, 1];
      expect(cosineSimilarity(vectorA, vectorB)).toBe(0);
    });

    it("should return -1 for opposite vectors", () => {
      const vectorA = [1, 2, 3];
      const vectorB = [-1, -2, -3];
      expect(cosineSimilarity(vectorA, vectorB)).toBe(-1);
    });

    it("should throw error for mismatched vector dimensions", () => {
      const vectorA = [1, 2, 3];
      const vectorB = [1, 2];

      expect(() => cosineSimilarity(vectorA, vectorB)).toThrow("Vector dimensions must match");
    });

    it("should handle zero vectors", () => {
      const zeroVector = [0, 0, 0];
      const normalVector = [1, 2, 3];

      expect(cosineSimilarity(zeroVector, normalVector)).toBe(0);
      expect(cosineSimilarity(normalVector, zeroVector)).toBe(0);
    });

    it("should handle negative values", () => {
      const vectorA = [-1, -2, -3];
      const vectorB = [1, 2, 3];

      expect(cosineSimilarity(vectorA, vectorB)).toBe(-1);
    });
  });

  describe("Income transaction categorization", () => {
    it("should categorize transfer income", () => {
      expect(categorizeByPattern("Chuyển khoản từ ABC", 5000000)).toBe("Transfer");
      expect(categorizeByPattern("Transfer from XYZ", 3000000)).toBe("Transfer");
    });

    it("should categorize salary income", () => {
      expect(categorizeByPattern("Lương tháng", 15000000)).toBe("Salary");
      expect(categorizeByPattern("Salary payment", 20000000)).toBe("Salary");
    });
  });

  describe("Edge cases", () => {
    it("should return null for uncategorized expenses", () => {
      expect(categorizeByPattern("Unknown merchant", -100000)).toBeNull();
    });

    it("should handle whitespace and trimming", () => {
      expect(categorizeByPattern("  Grab ride  ", -50000)).toBe("Transport");
      expect(categorizeByPattern("\nCoffee\n", -45000)).toBe("Food & Drink");
    });

    it("should handle special characters in content", () => {
      expect(categorizeByPattern("Grab@ride", -50000)).toBe("Transport");
      expect(categorizeByPattern("Coffee-shop", -45000)).toBe("Food & Drink");
    });

    it("should handle very long content", () => {
      const longContent = "Grab ride from district 1 to district 2 via highway with multiple stops";
      expect(categorizeByPattern(longContent, -50000)).toBe("Transport");
    });

    it("should handle content with numbers", () => {
      expect(categorizeByPattern("Grab123 ride", -50000)).toBe("Transport");
      expect(categorizeByPattern("Coffee456 shop", -45000)).toBe("Food & Drink");
    });
  });
});
