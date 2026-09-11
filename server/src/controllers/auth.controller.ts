import type { RequestHandler } from "express";
import { z } from "zod";
import { getAuthContext } from "../middleware/auth.js";
import { getCurrentUser, login } from "../services/auth.service.js";
import { clearAuthCookie, setAuthCookie } from "../utils/cookies.js";
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

export const postLogout: RequestHandler = (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
};

export const getMe: RequestHandler = async (req, res) => {
  const auth = getAuthContext(req);
  const user = await getCurrentUser(auth.userId);

  res.status(200).json({ user });
};
