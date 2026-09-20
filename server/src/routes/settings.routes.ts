import { Router } from "express";
import { getSettingsHandler, patchSettingsHandler } from "../controllers/settings.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const settingsRouter = Router();

// AGENTS.md #2 and #20 - system configuration belongs to the administrator. Technicians still
// receive the subset that affects their form, but it travels with the survey form data.
settingsRouter.use(requireAuth, requireRole("ADMIN"));

settingsRouter.get("/", getSettingsHandler);
settingsRouter.patch("/", patchSettingsHandler);