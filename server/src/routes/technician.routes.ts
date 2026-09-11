import { Router } from "express";
import {
  getMyDashboardHandler,
  getTechnicianDashboardHandler,
  getTechnicianHandler,
  listTechniciansHandler,
  patchTechnicianAvailabilityHandler,
} from "../controllers/technician.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const technicianRouter = Router();

technicianRouter.use(requireAuth);

technicianRouter.get("/me/dashboard", getMyDashboardHandler);
technicianRouter.get("/", requireRole("SUPERVISOR", "ADMIN"), listTechniciansHandler);
technicianRouter.get("/:id", requireRole("SUPERVISOR", "ADMIN"), getTechnicianHandler);
technicianRouter.get("/:id/dashboard", requireRole("SUPERVISOR", "ADMIN"), getTechnicianDashboardHandler);
technicianRouter.patch("/:id/availability", requireRole("SUPERVISOR", "ADMIN"), patchTechnicianAvailabilityHandler);