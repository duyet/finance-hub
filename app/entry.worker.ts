/**
 * PWA Service Worker
 *
 * Provides basic offline support for the Finance Hub app.
 * Caches static assets and API responses for offline access.
 */

/// <reference no-default-lib="true" />
/// <reference lib="webworker" />
/// <reference lib="webworker.iterable" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = "finance-hub-v1";
const STATIC_CACHE = "finance-hub-static-v1";

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  "/",
  "/dashboard",
  "/locales/en/common.json",
  "/locales/vi/common.json",
];

// Install event - precache static assets
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_ASSETS);
    })()
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name: string) => name !== STATIC_CACHE && name !== CACHE_NAME)
          .map((name: string) => caches.delete(name))
      );
    })()
  );
  self.clients.claim();
});

// Fetch event - network first, then cache strategy for API,
// cache first for static assets
self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) return;

  // API routes: network first, fall back to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets and locales: cache first, fall back to network
  event.respondWith(cacheFirst(request));
});

/**
 * Network first strategy for API requests
 */
async function networkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request);
    // Cache successful responses
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline fallback
    return new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Cache first strategy for static assets
 */
async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return offline page if available
    const offlineResponse = await cache.match("/offline");
    if (offlineResponse) {
      return offlineResponse;
    }
    throw error;
  }
}

export {};
