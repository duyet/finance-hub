/**
 * Cloudflare Workers Entry Point
 *
 * This file is the entry point for Cloudflare Workers deployment.
 * It exports the request handler that processes all incoming requests.
 */

import { createCloudflareRequestHandler } from "@react-router/cloudflare";

export default createCloudflareRequestHandler({
  // The build directory for the server bundle (relative to this file)
  build: "../build/server",

  // Get load context - passes Cloudflare bindings to loaders/actions
  async getLoadContext(request: Request, env: any) {
    return {
      env,
      cf: (request as any).cf,
    };
  },
});
