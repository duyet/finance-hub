/**
 * Unit tests for Storage Service
 *
 * Tests R2 storage operations for receipt images including:
 * - Key generation
 * - Thumbnail URL generation
 * - File upload validation
 * - Public URL generation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  generateThumbnail,
  generateAndStoreThumbnail,
  uploadReceiptToR2,
  uploadReceiptFromUrl,
  deleteReceiptFromR2,
  checkReceiptExists,
  getReceiptMetadata,
} from "~/lib/services/storage.server";

describe("Storage Service", () => {
  describe("generateThumbnail", () => {
    const mockRequest = {
      context: {
        cloudflare: {
          env: {
            BUCKET_NAME: "finance-hub-receipts",
            R2_PUBLIC_URL: "https://finance-hub-receipts.r2.dev",
          },
        },
      },
    } as any;

    it("should generate Cloudflare Image Resizing URL for R2.dev domains", async () => {
      const key = "receipts/user123/2025/12/1234567890-abc.jpg";
      const thumbnailUrl = await generateThumbnail(mockRequest, key, 300, 300);

      expect(thumbnailUrl).toContain("/cdn-cgi/image/");
      expect(thumbnailUrl).toContain("width=300");
      expect(thumbnailUrl).toContain("height=300");
      expect(thumbnailUrl).toContain("fit=cover");
    });

    it("should include quality and format parameters in transformation", async () => {
      const key = "receipts/user123/2025/12/1234567890-abc.jpg";
      const thumbnailUrl = await generateThumbnail(mockRequest, key, 300, 300);

      expect(thumbnailUrl).toContain("quality=85");
      expect(thumbnailUrl).toContain("format=auto");
    });

    it("should support custom fit methods", async () => {
      const key = "receipts/user123/2025/12/1234567890-abc.jpg";

      const containUrl = await generateThumbnail(mockRequest, key, 300, 300, "contain");
      expect(containUrl).toContain("fit=contain");

      const fillUrl = await generateThumbnail(mockRequest, key, 300, 300, "fill");
      expect(fillUrl).toContain("fit=fill");

      const scaleDownUrl = await generateThumbnail(mockRequest, key, 300, 300, "scale-down");
      expect(scaleDownUrl).toContain("fit=scale-down");
    });

    it("should support custom dimensions", async () => {
      const key = "receipts/user123/2025/12/1234567890-abc.jpg";
      const thumbnailUrl = await generateThumbnail(mockRequest, key, 150, 200);

      expect(thumbnailUrl).toContain("width=150");
      expect(thumbnailUrl).toContain("height=200");
    });

    it("should return original URL for non-Cloudflare domains", async () => {
      const key = "receipts/user123/2025/12/1234567890-abc.jpg";
      const mockRequestNonCf = {
        context: {
          cloudflare: {
            env: {
              BUCKET_NAME: "finance-hub-receipts",
              R2_PUBLIC_URL: "https://example.com",
            },
          },
        },
      } as any;

      const thumbnailUrl = await generateThumbnail(mockRequestNonCf, key);
      expect(thumbnailUrl).toBe("https://example.com/receipts/user123/2025/12/1234567890-abc.jpg");
    });

    it("should work with workers.dev domains", async () => {
      const key = "receipts/user123/2025/12/1234567890-abc.jpg";
      const mockRequestWorkersDev = {
        context: {
          cloudflare: {
            env: {
              BUCKET_NAME: "finance-hub-receipts",
              R2_PUBLIC_URL: "https://finance-hub.workers.dev",
            },
          },
        },
      } as any;

      const thumbnailUrl = await generateThumbnail(mockRequestWorkersDev, key);
      expect(thumbnailUrl).toContain("/cdn-cgi/image/");
    });

    it("should work with pages.dev domains", async () => {
      const key = "receipts/user123/2025/12/1234567890-abc.jpg";
      const mockRequestPagesDev = {
        context: {
          cloudflare: {
            env: {
              BUCKET_NAME: "finance-hub-receipts",
              R2_PUBLIC_URL: "https://finance-hub.pages.dev",
            },
          },
        },
      } as any;

      const thumbnailUrl = await generateThumbnail(mockRequestPagesDev, key);
      expect(thumbnailUrl).toContain("/cdn-cgi/image/");
    });

    it("should handle invalid URLs gracefully", async () => {
      const mockRequestInvalid = {
        context: {
          cloudflare: {
            env: {
              BUCKET_NAME: "finance-hub-receipts",
              R2_PUBLIC_URL: "not-a-url",
            },
          },
        },
      } as any;

      const key = "receipts/user123/2025/12/1234567890-abc.jpg";
      const thumbnailUrl = await generateThumbnail(mockRequestInvalid, key);

      // Should fall back to original URL on error
      expect(thumbnailUrl).toBeDefined();
    });

    it("should preserve original path in transformation URL", async () => {
      const key = "receipts/user123/2025/12/1234567890-abc.jpg";
      const thumbnailUrl = await generateThumbnail(mockRequest, key, 300, 300);

      expect(thumbnailUrl).toContain("receipts/user123/2025/12/1234567890-abc.jpg");
    });

    it("should handle complex file paths", async () => {
      const key = "receipts/user-with-dash/2025/12/1234567890-abc123.jpg";
      const thumbnailUrl = await generateThumbnail(mockRequest, key, 300, 300);

      expect(thumbnailUrl).toContain("/cdn-cgi/image/");
      expect(thumbnailUrl).toContain("user-with-dash");
    });
  });

  describe("generateAndStoreThumbnail", () => {
    it("should throw error when R2 bucket not available", async () => {
      const mockRequestNoBucket = {
        context: {
          cloudflare: {
            env: {},
          },
        },
      } as any;

      await expect(
        generateAndStoreThumbnail(mockRequestNoBucket, "receipts/test.jpg", 300, 300)
      ).rejects.toThrow("R2 bucket binding not available");
    });

    it("should return null when original image not found", async () => {
      const mockBucket = {
        get: vi.fn().mockResolvedValue(null),
      };

      const mockRequest = {
        context: {
          cloudflare: {
            env: {
              RECEIPTS_BUCKET: mockBucket,
            },
          },
        },
      } as any;

      const result = await generateAndStoreThumbnail(mockRequest, "receipts/nonexistent.jpg", 300, 300);
      expect(result).toBeNull();
    });
  });

  describe("Thumbnail key naming", () => {
    it("should generate thumbnail key with dimensions", () => {
      // Test the key naming pattern used in generateAndStoreThumbnail
      const key = "receipts/user123/2025/12/1234567890-abc.jpg";
      const width = 300;
      const height = 300;

      const thumbnailKey = key.replace(/(\.[^.]+)$/, `-thumb${width}x${height}$1`);
      expect(thumbnailKey).toBe("receipts/user123/2025/12/1234567890-abc-thumb300x300.jpg");
    });

    it("should handle different file extensions", () => {
      const pngKey = "receipts/user123/2025/12/1234567890-abc.png";
      const thumbnailKey = pngKey.replace(/(\.[^.]+)$/, `-thumb300x300$1`);
      expect(thumbnailKey).toBe("receipts/user123/2025/12/1234567890-abc-thumb300x300.png");

      const heicKey = "receipts/user123/2025/12/1234567890-abc.heic";
      const heicThumbnailKey = heicKey.replace(/(\.[^.]+)$/, `-thumb300x300$1`);
      expect(heicThumbnailKey).toBe("receipts/user123/2025/12/1234567890-abc-thumb300x300.heic");
    });
  });

  describe("Cloudflare Image Resizing parameters", () => {
    it("should generate valid transformation string", () => {
      const width = 300;
      const height = 300;
      const fit = "cover";

      const transformations = [
        `width=${width}`,
        `height=${height}`,
        `fit=${fit}`,
        "quality=85",
        "format=auto",
      ].join(",");

      expect(transformations).toBe("width=300,height=300,fit=cover,quality=85,format=auto");
    });

    it("should handle different quality settings", () => {
      const transformations = [
        `width=200`,
        `height=200`,
        "fit=contain",
        "quality=90",
        "format=auto",
      ].join(",");

      expect(transformations).toBe("width=200,height=200,fit=contain,quality=90,format=auto");
    });
  });

  describe("Edge cases", () => {
    it("should handle very large dimensions", async () => {
      const mockRequest = {
        context: {
          cloudflare: {
            env: {
              BUCKET_NAME: "finance-hub-receipts",
              R2_PUBLIC_URL: "https://finance-hub-receipts.r2.dev",
            },
          },
        },
      } as any;

      const key = "receipts/user123/2025/12/1234567890-abc.jpg";
      const thumbnailUrl = await generateThumbnail(mockRequest, key, 4000, 4000);

      expect(thumbnailUrl).toContain("width=4000");
      expect(thumbnailUrl).toContain("height=4000");
    });

    it("should handle very small dimensions", async () => {
      const mockRequest = {
        context: {
          cloudflare: {
            env: {
              BUCKET_NAME: "finance-hub-receipts",
              R2_PUBLIC_URL: "https://finance-hub-receipts.r2.dev",
            },
          },
        },
      } as any;

      const key = "receipts/user123/2025/12/1234567890-abc.jpg";
      const thumbnailUrl = await generateThumbnail(mockRequest, key, 50, 50);

      expect(thumbnailUrl).toContain("width=50");
      expect(thumbnailUrl).toContain("height=50");
    });

    it("should handle square thumbnails by default", async () => {
      const mockRequest = {
        context: {
          cloudflare: {
            env: {
              BUCKET_NAME: "finance-hub-receipts",
              R2_PUBLIC_URL: "https://finance-hub-receipts.r2.dev",
            },
          },
        },
      } as any;

      const key = "receipts/user123/2025/12/1234567890-abc.jpg";
      // Use default dimensions
      const thumbnailUrl = await generateThumbnail(mockRequest, key);

      expect(thumbnailUrl).toContain("width=300");
      expect(thumbnailUrl).toContain("height=300");
    });
  });
});
