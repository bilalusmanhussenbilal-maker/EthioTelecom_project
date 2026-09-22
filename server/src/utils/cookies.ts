import type { CookieOptions, Response } from "express";
import { usesCrossSiteAuth } from "../config/cors.js";
import { env } from "../config/env.js";

function baseOptions(): CookieOptions {
  const crossSite = usesCrossSiteAuth();

  return {
    httpOnly: true,
    secure: crossSite,
    sameSite: crossSite ? "none" : "lax",
    path: "/",
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(env.COOKIE_NAME, token, {
    ...baseOptions(),
    maxAge: env.JWT_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(env.COOKIE_NAME, baseOptions());
}
