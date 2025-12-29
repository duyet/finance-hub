import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // plugins: [], // Don't use React Router plugin for unit tests
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
  test: {
    // Exclude integration tests and E2E tests
    exclude: ["**/node_modules/**", "**/e2e/**", "**/dist/**", "**/build/**"],
    // Use node environment for pure service unit tests
    environment: "node",
    // Include only __tests__ directory
    include: ["app/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    // globals: true,
    setupFiles: [],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        "app/__tests__/**",
        "**/*.config.{js,ts}",
        "**/server.ts",
        "app/root.tsx",
        "app/routes/**",
      ],
    },
  },
});
