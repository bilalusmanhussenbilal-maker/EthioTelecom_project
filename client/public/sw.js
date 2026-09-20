/*
 * App-shell service worker.
 *
 * What it is for: a technician in the field reloads the app or opens it from the home screen with
 * no signal. Without this the browser shows its own error page; with it the shell comes from the
 * cache and the technician lands somewhere explainable.
 *
 * What it deliberately does not do: touch the API. Survey data, the offline queue and conflict
 * handling already live in IndexedDB under the app's control, and a second cached copy of an API
 * response would be a second, silently stale source of truth. Requests to another origin are left
 * alone.
 *
 * Known limit: the App Router fetches per-route payloads over the network, so a page that was
 * never visited while online falls back to /offline.html rather than rendering.
 */

const VERSION = "v1";
const STATIC_CACHE = `app-shell-${VERSION}`;
const PAGE_CACHE = `app-pages-${VERSION}`;
const CACHE_NAMES = [STATIC_CACHE, PAGE_CACHE];

const OFFLINE_URL = "/offline.html";

// Content-hashed build output is safe to serve from the cache; offline.html must exist before the
// first offline navigation, which is why it is precached during install.
const PRECACHE_URLS = [OFFLINE_URL];
const SHELL_PATHS = ["/_next/static/", OFFLINE_URL];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !CACHE_NAMES.includes(key)).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isCacheable(response) {
  const cacheControl = response.headers.get("Cache-Control") || "";
  return !cacheControl.includes("no-store");
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const revalidated = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        void cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => undefined);

  if (cached) {
    return cached;
  }

  const response = await revalidated;

  if (response) {
    return response;
  }

  return new Response("", { status: 504, statusText: "Offline" });
}

async function handleNavigation(request) {
  try {
    const response = await fetch(request);

    if (response && response.ok && isCacheable(response)) {
      const cache = await caches.open(PAGE_CACHE);
      void cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await caches.match(request);

    if (cached) {
      return cached;
    }

    const offline = await caches.match(OFFLINE_URL);

    if (offline) {
      return offline;
    }

    return new Response("You are offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (SHELL_PATHS.some((path) => url.pathname.startsWith(path))) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});