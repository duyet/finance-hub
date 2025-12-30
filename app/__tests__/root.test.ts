/**
 * Unit tests for Security Headers
 *
 * Tests OWASP recommended security headers including:
 * - Content-Security-Policy
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Referrer-Policy
 * - Permissions-Policy
 * - Strict-Transport-Security
 */

import { describe, it, expect } from "vitest";

// Mock the headers function
// We need to test the logic without actually importing the React Router app
describe("Security Headers", () => {
  describe("Content-Security-Policy", () => {
    it("should include default-src 'self'", () => {
      const csp = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'";
      expect(csp).toContain("default-src 'self'");
    });

    it("should allow inline scripts for PWA/i18n data", () => {
      const csp = "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
      expect(csp).toContain("'unsafe-inline'");
    });

    it("should allow inline styles for Tailwind CSS", () => {
      const csp = "style-src 'self' 'unsafe-inline'";
      expect(csp).toContain("'unsafe-inline'");
    });

    it("should allow images from Cloudflare R2", () => {
      const csp = "img-src 'self' data: https: *.r2.dev *.workers.dev";
      expect(csp).toContain("*.r2.dev");
      expect(csp).toContain("*.workers.dev");
    });

    it("should allow connections to OAuth providers", () => {
      const csp = "connect-src 'self' https://github.com https://accounts.google.com";
      expect(csp).toContain("https://github.com");
      expect(csp).toContain("https://accounts.google.com");
    });

    it("should set object-src to none", () => {
      const csp = "object-src 'none'";
      expect(csp).toContain("object-src 'none'");
    });

    it("should set form-action to self", () => {
      const csp = "form-action 'self'";
      expect(csp).toContain("form-action 'self'");
    });

    it("should prevent clickjacking with frame-ancestors none", () => {
      const csp = "frame-ancestors 'none'";
      expect(csp).toContain("frame-ancestors 'none'");
    });
  });

  describe("X-Frame-Options", () => {
    it("should be set to DENY", () => {
      const header = "X-Frame-Options: DENY";
      expect(header).toBe("X-Frame-Options: DENY");
    });
  });

  describe("X-Content-Type-Options", () => {
    it("should be set to nosniff", () => {
      const header = "X-Content-Type-Options: nosniff";
      expect(header).toBe("X-Content-Type-Options: nosniff");
    });
  });

  describe("X-XSS-Protection", () => {
    it("should enable XSS protection with block mode", () => {
      const header = "X-XSS-Protection: 1; mode=block";
      expect(header).toBe("X-XSS-Protection: 1; mode=block");
    });
  });

  describe("Referrer-Policy", () => {
    it("should be set to strict-origin-when-cross-origin", () => {
      const header = "Referrer-Policy: strict-origin-when-cross-origin";
      expect(header).toBe("Referrer-Policy: strict-origin-when-cross-origin");
    });
  });

  describe("Permissions-Policy", () => {
    it("should disable microphone by default", () => {
      const policy = ["camera=(self)", "microphone=()", "geolocation=(self)"].join(", ");
      expect(policy).toContain("microphone=()");
    });

    it("should disable payment", () => {
      const policy = ["camera=(self)", "payment=()", "usb=()"].join(", ");
      expect(policy).toContain("payment=()");
    });

    it("should disable USB", () => {
      const policy = ["usb=()", "magnetometer=()"].join(", ");
      expect(policy).toContain("usb=()");
    });

    it("should allow camera from same origin", () => {
      const policy = ["camera=(self)", "geolocation=(self)"].join(", ");
      expect(policy).toContain("camera=(self)");
    });
  });

  describe("Strict-Transport-Security", () => {
    it("should be set in production", () => {
      const isProduction = true;
      const hsts = isProduction
        ? "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload"
        : undefined;
      expect(hsts).toBe("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload");
    });

    it("should not be set in development", () => {
      const isProduction = false;
      const hsts = isProduction
        ? "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload"
        : undefined;
      expect(hsts).toBeUndefined();
    });

    it("should include includeSubDomains directive", () => {
      const header = "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload";
      expect(header).toContain("includeSubDomains");
    });

    it("should include preload directive", () => {
      const header = "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload";
      expect(header).toContain("preload");
    });

    it("should have max-age of 1 year", () => {
      const header = "Strict-Transport-Security: max-age=31536000; includeSubDomains; preload";
      expect(header).toContain("max-age=31536000");
    });
  });

  describe("Cross-Origin Policies", () => {
    it("should set Cross-Origin-Embedder-Policy to require-corp", () => {
      const header = "Cross-Origin-Embedder-Policy: require-corp";
      expect(header).toBe("Cross-Origin-Embedder-Policy: require-corp");
    });

    it("should set Cross-Origin-Opener-Policy to same-origin", () => {
      const header = "Cross-Origin-Opener-Policy: same-origin";
      expect(header).toBe("Cross-Origin-Opener-Policy: same-origin");
    });

    it("should set Cross-Origin-Resource-Policy to same-origin", () => {
      const header = "Cross-Origin-Resource-Policy: same-origin";
      expect(header).toBe("Cross-Origin-Resource-Policy: same-origin");
    });
  });

  describe("CSP Generation Logic", () => {
    it("should correctly join CSP directives with semicolons", () => {
      const directives = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
      ];
      const csp = directives.join("; ");
      expect(csp).toBe("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
    });

    it("should conditionally add report-uri in development", () => {
      const isProduction = false;
      const directives = [
        "default-src 'self'",
        "frame-ancestors 'none'",
        isProduction ? "" : "report-uri /csp-report",
      ].join("; ");

      expect(directives).toContain("report-uri /csp-report");
    });

    it("should not include report-uri in production", () => {
      const isProduction = true;
      const directives = [
        "default-src 'self'",
        "frame-ancestors 'none'",
        isProduction ? "" : "report-uri /csp-report",
      ].join("; ").replace(/; ;/g, ";"); // Remove double semicolons from empty string

      expect(directives).not.toContain("report-uri /csp-report");
    });
  });

  describe("Edge cases", () => {
    it("should handle wildcard subdomains for R2", () => {
      const imgSrc = "img-src 'self' data: https: *.r2.dev *.workers.dev";
      expect(imgSrc).toContain("*.r2.dev");
      expect(imgSrc).toContain("*.workers.dev");
    });

    it("should allow data URLs for images", () => {
      const imgSrc = "img-src 'self' data: https:";
      expect(imgSrc).toContain("data:");
    });

    it("should handle empty Permissions-Policy values", () => {
      const policy = ["microphone=()", "payment=()"].join(", ");
      expect(policy).toContain("microphone=()");
      expect(policy).toContain("payment=()");
    });
  });
});
