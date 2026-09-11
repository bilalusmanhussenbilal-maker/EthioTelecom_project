import type { RequestHandler } from "express";
import { z } from "zod";
import { getAuthContext } from "../middleware/auth.js";
import {
  getMyDashboard,
  getTechnicianDashboard,
  getTechnicianProfile,
  getTechniciansWithWorkload,
  setAvailability,
} from "../services/technician.service.js";
import { parseBody, parseParams } from "../utils/validation.js";

const idParams = z.object({ id: z.string().min(1) });
const availabilitySchema = z.object({ isAvailable: z.boolean() });

export const listTechniciansHandler: RequestHandler = async (_req, res) => {
  res.status(200).json({ technicians: await getTechniciansWithWorkload() });
};

export const getTechnicianHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  res.status(200).json({ technician: await getTechnicianProfile(id) });
};

export const getTechnicianDashboardHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  res.status(200).json(await getTechnicianDashboard(id));
};

export const getMyDashboardHandler: RequestHandler = async (req, res) => {
  res.status(200).json(await getMyDashboard(getAuthContext(req)));
};

export const patchTechnicianAvailabilityHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(availabilitySchema, req);

  res.status(200).json({ technician: await setAvailability(id, body.isAvailable, getAuthContext(req)) });
};