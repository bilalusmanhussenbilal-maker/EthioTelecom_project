import type { RequestHandler } from "express";
import { z } from "zod";
import { getAuthContext, readAuthCookie } from "../middleware/auth.js";
import { getCurrentUser, login, logout } from "../services/auth.service.js";
import { verifyAuthToken } from "../utils/jwt.js";
import { clearAuthCookie, setAuthCookie } from "../utils/cookies.js";
import { logger } from "../utils/logger.js";
import { parseBody } from "../utils/validation.js";

const loginSchema = z.object({
  username: z.string().trim().min(3, "must be at least 3 characters").max(64),
  password: z.string().min(8, "must be at least 8 characters").max(128),
});

export const postLogin: RequestHandler = async (req, res) => {
  const body = parseBody(loginSchema, req);
  const result = await login(body.username, body.password);

  setAuthCookie(res, result.token);

  res.status(200).json({ user: result.user });
};

export const postLogout: RequestHandler = async (req, res) => {
  const token = readAuthCookie(req);
  const payload = token ? await verifyAuthToken(token) : null;

  // Also revoke the token itself, so a copy taken out of the cookie jar stops working.
  // Clearing the cookie must not be the step that fails, so a database problem during
  // revocation is logged and swallowed: the caller still ends up signed out.
  if (payload) {
    try {
      await logout(payload.userId);
    } catch (error) {
      logger.warn({ err: error, userId: payload.userId }, "could not revoke the session on logout");
    }
  }

  clearAuthCookie(res);
  res.status(204).end();
};

export const getMe: RequestHandler = async (req, res) => {
  const auth = getAuthContext(req);
  const user = await getCurrentUser(auth.userId);

  res.status(200).json({ user });
};
