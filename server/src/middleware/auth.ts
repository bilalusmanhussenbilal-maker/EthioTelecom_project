import type { Request, RequestHandler } from "express";
import { env } from "../config/env.js";
import { isUserRole } from "../models/roles.js";
import type { UserRole } from "../models/roles.js";
import { findUserById } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { verifyAuthToken } from "../utils/jwt.js";
import type { AuthTokenPayload } from "../utils/jwt.js";

function readAuthCookie(req: Request): string | null {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[env.COOKIE_NAME];

  return typeof token === "string" && token.length > 0 ? token : null;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = readAuthCookie(req);

    if (!token) {
      throw ApiError.unauthorized("You must sign in to continue");
    }

    const payload = await verifyAuthToken(token);

    if (!payload) {
      throw ApiError.unauthorized("Your session has expired. Please sign in again.");
    }

    const user = await findUserById(payload.userId);

    if (!user || !user.isActive) {
      throw ApiError.unauthorized("This account is no longer active");
    }

    if (!isUserRole(user.role)) {
      throw ApiError.forbidden("This account has an unusable role");
    }

    req.auth = {
      userId: user.id,
      username: user.username,
      role: user.role,
      ...(user.technician ? { technicianId: user.technician.id } : {}),
    };

    next();
  } catch (error) {
    next(error);
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    const auth = req.auth;

    if (!auth) {
      next(ApiError.unauthorized("You must sign in to continue"));
      return;
    }

    if (!roles.includes(auth.role)) {
      next(ApiError.forbidden("You do not have permission to perform this action"));
      return;
    }

    next();
  };
}

export function getAuthContext(req: Request): AuthTokenPayload {
  if (!req.auth) {
    throw ApiError.unauthorized("You must sign in to continue");
  }

  return req.auth;
}
