"use client";

import { useEffect } from "react";

/**
 * Installs the app-shell service worker (client/public/sw.js).
 *
 * Only in a production build. The dev server rewrites chunks on every edit and serves them from a
 * different path, so a worker answering those from a cache produces a stale page whose "failed to
 * load chunk" errors are misleading. In development any worker left behind by an earlier
 * production run is removed instead, together with its caches.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      void (async () => {
        const registrations = await navigator.serviceWorker.getRegistrations();

        await Promise.all(registrations.map((registration) => registration.unregister()));

        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      })().catch(() => undefined);

      return;
    }

    // Offline shell caching is an enhancement, never a requirement: a browser that refuses the
    // registration must not take the app down with it.
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);

  return null;
}