import { Router } from "express";
import { listActivityHandler } from "../controllers/activity.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const activityRouter = Router();

activityRouter.use(requireAuth, requireRole("ADMIN"));

activityRouter.get("/", listActivityHandler);