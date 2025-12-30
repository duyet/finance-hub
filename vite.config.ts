/// <reference types="vitest/config" />
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  plugins: [reactRouter()],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
  test: {
    // Exclude e2e tests (run with Playwright separately)
    exclude: ["e2e/**", "node_modules/**"],
    include: ["app/**/*.test.ts", "app/**/*.test.tsx"],
  },
});
