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
          if (id.includes('node_modules/recharts')) {
            return 'recharts';
          }
          if (id.includes('node_modules/papaparse')) {
            return 'papaparse';
          }
          if (id.includes('node_modules/i18next') ||
              id.includes('node_modules/react-i18next') ||
              id.includes('node_modules/i18next-browser-languagedetector')) {
            return 'i18next';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
