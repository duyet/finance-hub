import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // Use Cloudflare adapter for Workers deployment
  serverModuleFormat: "esm",
  prerender: false,
  // Build output for Cloudflare Workers
  buildEnd: async ({ buildManifest }) => {
    // The build output will be in build/client and build/server
    // No additional steps needed - wrangler.toml points to these directories
  },
} satisfies Config;
