/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Cloudflare bindings are defined in workers-env.d.ts for server code
  // Client code should access these via server loaders/actions
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

