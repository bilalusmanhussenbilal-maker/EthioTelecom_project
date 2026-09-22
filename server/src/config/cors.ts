import { env, isDevelopment } from "./env.js";

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const corsOrigins = parseCorsOrigins(env.CORS_ORIGIN);

/** True when the browser frontend is on a different site than the API (e.g. Vercel + Render). */
export function usesCrossSiteAuth(): boolean {
  if (env.COOKIE_CROSS_SITE !== undefined) {
    return env.COOKIE_CROSS_SITE;
  }

  // Every deployment is treated as split (Next.js on Vercel, API on Render): a cross-site
  // request only carries the session cookie when it is SameSite=None; Secure, otherwise the
  // browser drops it and every call looks unauthenticated.
  if (!isDevelopment) {
    return true;
  }

  // Local development is same-site over http, where browsers reject a Secure cookie, so the lax
  // default is the right one. Only a real domain in CORS_ORIGIN (a hosted frontend calling a
  // local API) makes the browser treat those requests as cross-site.
  return corsOrigins.some((origin) => {
    try {
      const hostname = new URL(origin).hostname;
      return hostname !== "localhost" && hostname !== "127.0.0.1";
    } catch {
      return false;
    }
  });
}

export function isAllowedCorsOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  if (corsOrigins.includes(origin)) {
    return true;
  }

  if (isDevelopment) {
    try {
      const hostname = new URL(origin).hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}
