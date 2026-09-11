import type { RequestHandler } from "express";
import { z } from "zod";
import { getAuthContext } from "../middleware/auth.js";
import {
  createUserForAdmin,
  getUserForAdmin,
  listUsersForAdmin,
  resetUserPassword,
  setUserActiveForAdmin,
  updateUserForAdmin,
} from "../services/user.service.js";
import { parseBody, parseParams, parseQuery } from "../utils/validation.js";

const idParams = z.object({ id: z.string().min(1) });
const roleSchema = z.enum(["TECHNICIAN", "SUPERVISOR", "ADMIN"]);

const listQuerySchema = z.object({
  role: roleSchema.optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9._-]+$/, "may only contain letters, digits, dot, underscore or dash"),
  fullName: z.string().trim().min(3).max(120),
  password: z.string().min(8, "must be at least 8 characters").max(128),
  role: roleSchema,
  phoneNumber: z.string().trim().min(6).max(32).nullable().optional(),
  employeeCode: z.string().trim().min(1).max(32).nullable().optional(),
  zone: z.string().trim().max(64).nullable().optional(),
});

const updateUserSchema = z.object({
  fullName: z.string().trim().min(3).max(120).optional(),
  phoneNumber: z.string().trim().min(6).max(32).nullable().optional(),
  zone: z.string().trim().max(64).nullable().optional(),
  isAvailable: z.boolean().optional(),
});

const activeSchema = z.object({ isActive: z.boolean() });
const passwordSchema = z.object({ password: z.string().min(8, "must be at least 8 characters").max(128) });

export const listUsersHandler: RequestHandler = async (req, res) => {
  const query = parseQuery(listQuerySchema, req);

  const result = await listUsersForAdmin(
    getAuthContext(req),
    {
      ...(query.role === undefined ? {} : { role: query.role }),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search === undefined ? {} : { search: query.search }),
    },
    { page: query.page, pageSize: query.pageSize },
  );

  res.status(200).json(result);
};

export const getUserHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  res.status(200).json(await getUserForAdmin(id, getAuthContext(req)));
};

export const postUserHandler: RequestHandler = async (req, res) => {
  const body = parseBody(createUserSchema, req);
  const user = await createUserForAdmin(body, getAuthContext(req));

  res.status(201).json({ user });
};

export const patchUserHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(updateUserSchema, req);

  res.status(200).json({ user: await updateUserForAdmin(id, body, getAuthContext(req)) });
};

export const patchUserActiveHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(activeSchema, req);

  res.status(200).json({ user: await setUserActiveForAdmin(id, body.isActive, getAuthContext(req)) });
};

export const patchUserPasswordHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(passwordSchema, req);

  res.status(200).json(await resetUserPassword(id, body.password, getAuthContext(req)));
};