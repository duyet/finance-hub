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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split large vendor libraries into separate chunks
          // Note: @react-pdf/renderer is externalized by React Router

          // Chart library - already lazy loaded
          if (id.includes('node_modules/recharts')) {
            return 'recharts';
          }

          // CSV parsing
          if (id.includes('node_modules/papaparse')) {
            return 'papaparse';
          }

          // i18n libraries
          if (id.includes('node_modules/i18next') ||
              id.includes('node_modules/react-i18next') ||
              id.includes('node_modules/i18next-browser-languagedetector')) {
            return 'i18next';
          }

          // Radix UI components
          if (id.includes('node_modules/@radix-ui')) {
            return 'radix-ui';
          }

          // Date manipulation library
          if (id.includes('node_modules/date-fns')) {
            return 'date-fns';
          }

          // Schema validation
          if (id.includes('node_modules/zod')) {
            return 'zod';
          }

          // React Router itself
          if (id.includes('node_modules/react-router') ||
              id.includes('node_modules/@react-router')) {
            return 'react-router';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
