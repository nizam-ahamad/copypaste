/**
 * CopyPaste.me Service Worker
 * PWA offline functionality with intelligent caching
 */

const CACHE_VERSION = "copypaste-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const MAX_DYNAMIC_CACHE_SIZE = 50;

// Resources to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/faq.html",
  "/style.css",
  "/app.js",
  "/android-chrome-192x192.png",
  "/android-chrome-256x256.png",
  "/site.webmanifest",
  "/static/images/copypaste-logo.png",
  "/static/images/copypaste-logo-white.png",
  "/static/images/waiting.svg",
];

// Network-first resources (real-time features)
const NETWORK_FIRST_PATTERNS = [
  /\/socket\.io/,
  /\/connect/,
  /\/[0-9a-z]{32}/, // Token routes
];

// Cache-first resources (static assets)
const CACHE_FIRST_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:woff|woff2|ttf|eot)$/,
  /\/static\//,
];

/**
 * Install event - cache static assets
 */
self.addEventListener("install", (event) => {
  console.log("[ServiceWorker] Installing...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[ServiceWorker] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("[ServiceWorker] Installation complete");
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error("[ServiceWorker] Installation failed:", error);
      }),
  );
});

/**
 * Activate event - cleanup old caches
 */
self.addEventListener("activate", (event) => {
  console.log("[ServiceWorker] Activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log("[ServiceWorker] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        console.log("[ServiceWorker] Activation complete");
        return self.clients.claim(); // Take control immediately
      }),
  );
});

/**
 * Fetch event - intelligent caching strategy
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // CRITICAL: Skip ALL socket.io requests (WebSocket/polling)
  if (url.pathname.includes("/socket.io/")) {
    return; // Let socket.io handle its own requests
  }

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome extensions and different origins
  if (
    !url.origin.includes(self.location.origin) &&
    !url.protocol.startsWith("http")
  ) {
    return;
  }

  // Network-first for real-time features and API calls
  if (NETWORK_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Cache-first for static assets
  if (CACHE_FIRST_PATTERNS.some((pattern) => pattern.test(url.pathname))) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Default: Network-first with cache fallback
  event.respondWith(networkFirstStrategy(request));
});

/**
 * Network-first strategy - for real-time content
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses in dynamic cache
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log("[ServiceWorker] Serving from cache (offline):", request.url);
      return cachedResponse;
    }

    // If HTML page and nothing in cache, return offline page
    if (request.headers.get("accept").includes("text/html")) {
      return caches.match("/index.html");
    }

    throw error;
  }
}

/**
 * Cache-first strategy - for static assets
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error("[ServiceWorker] Fetch failed:", error);
    throw error;
  }
}

/**
 * Trim cache to prevent unlimited growth
 */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    trimCache(cacheName, maxItems);
  }
}

/**
 * Message event - handle messages from clients
 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName)),
        );
      }),
    );
  }
});

/**
 * Sync event - for background sync (future enhancement)
 */
self.addEventListener("sync", (event) => {
  console.log("[ServiceWorker] Background sync:", event.tag);
  // Future: implement background sync for queued transfers
});

/**
 * Push event - for push notifications (future enhancement)
 */
self.addEventListener("push", (event) => {
  console.log("[ServiceWorker] Push notification received");
  // Future: implement push notifications for connection requests
});
