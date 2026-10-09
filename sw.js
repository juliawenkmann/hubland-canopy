/*
 * Service worker: lets Tree Tracker open without a connection in the field.
 *
 * - App files (HTML, CSS, JS, data): network first, so updates show up as soon
 *   as you're online; the cached copy is used when offline.
 * - Botanical plates and pinned CDN libraries: cache first.
 * - Aerial map tiles: cache first, capped, so areas you've viewed work offline.
 * - Firebase / Overpass traffic is never intercepted; Firestore has its own
 *   offline queue and the app keeps an outbox in localStorage.
 */
"use strict";

const VERSION = "v1";
const SHELL_CACHE = `tree-tracker-shell-${VERSION}`;
const ASSET_CACHE = `tree-tracker-assets-${VERSION}`;
const TILE_CACHE = `tree-tracker-tiles-${VERSION}`;
const MAX_TILES = 2500;
const CDN_HOSTS = ["unpkg.com", "www.gstatic.com"];
const TILE_HOST = "geoservices.bayern.de";

// Everything index.html references, so the list never drifts from the page.
async function shellUrls() {
  const response = await fetch("./", { cache: "reload" });
  const html = await response.text();
  const urls = new Set(["./"]);
  for (const [, url] of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
    if (!/^(https?:|data:|mailto:)/.test(url) || CDN_HOSTS.some((host) => url.includes(`//${host}/`))) {
      urls.add(url);
    }
  }
  return [...urls];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      const urls = await shellUrls();
      await Promise.all(
        urls.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch((error) => {
            console.warn("Not cached for offline use:", url, error);
          }),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, ASSET_CACHE, TILE_CACHE]);
      for (const key of await caches.keys()) {
        if (key.startsWith("tree-tracker-") && !keep.has(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached =
      (await cache.match(request, { ignoreSearch: true })) ||
      (request.mode === "navigate" && (await cache.match("./")));
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // Tiles are CORS-enabled; only <script> tags without crossorigin come back opaque.
  if (response.ok || (response.type === "opaque" && cacheName !== TILE_CACHE)) {
    await cache.put(request, response.clone());
    if (cacheName === TILE_CACHE) trimTiles(cache);
  }
  return response;
}

let trimming = false;
async function trimTiles(cache) {
  if (trimming) return;
  trimming = true;
  try {
    const keys = await cache.keys();
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_TILES))) {
      await cache.delete(key);
    }
  } finally {
    trimming = false;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      url.pathname.includes("/assets/plates/")
        ? cacheFirst(request, ASSET_CACHE)
        : networkFirst(request),
    );
  } else if (CDN_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  } else if (url.hostname === TILE_HOST) {
    event.respondWith(cacheFirst(request, TILE_CACHE));
  }
});
