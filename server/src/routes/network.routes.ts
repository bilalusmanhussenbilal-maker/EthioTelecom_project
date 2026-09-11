import { Router } from "express";
import {
  getAreaHandler,
  getAreasHandler,
  getAvailablePortsHandler,
  getBoxByCodeHandler,
  getBoxHandler,
  getBoxPortsHandler,
  getBoxesHandler,
  getFormOptionsHandler,
  getLineHandler,
  getLinesHandler,
  getServiceByCodeHandler,
  getServiceHandler,
  getServicesHandler,
} from "../controllers/network.controller.js";
import {
  deleteAreaHandler,
  deleteBoxHandler,
  deleteLineHandler,
  deletePortHandler,
  deleteServiceHandler,
  patchAreaHandler,
  patchBoxHandler,
  patchLineHandler,
  patchPortHandler,
  patchServiceHandler,
  postAreaHandler,
  postBoxHandler,
  postLineHandler,
  postPortHandler,
  postServiceHandler,
} from "../controllers/network-admin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const networkRouter = Router();

networkRouter.use(requireAuth);

networkRouter.get("/areas", getAreasHandler);
networkRouter.get("/areas/:id", getAreaHandler);
networkRouter.get("/boxes", getBoxesHandler);
networkRouter.get("/boxes/code/:code", getBoxByCodeHandler);
networkRouter.get("/boxes/:id", getBoxHandler);
networkRouter.get("/boxes/:id/ports", getBoxPortsHandler);
networkRouter.get("/boxes/:id/available-ports", getAvailablePortsHandler);
networkRouter.get("/lines", getLinesHandler);
networkRouter.get("/lines/:id", getLineHandler);
networkRouter.get("/services", getServicesHandler);
networkRouter.get("/services/code/:code", getServiceByCodeHandler);
networkRouter.get("/services/:id", getServiceHandler);
networkRouter.get("/options", getFormOptionsHandler);
/* ---------------------------------------------- administrator management -- */

const requireAdmin = requireRole("ADMIN");

// AGENTS.md #2/#20 - the administrator manages network data and service areas.
networkRouter.post("/areas", requireAdmin, postAreaHandler);
networkRouter.patch("/areas/:id", requireAdmin, patchAreaHandler);
networkRouter.delete("/areas/:id", requireAdmin, deleteAreaHandler);

networkRouter.post("/boxes", requireAdmin, postBoxHandler);
networkRouter.patch("/boxes/:id", requireAdmin, patchBoxHandler);
networkRouter.delete("/boxes/:id", requireAdmin, deleteBoxHandler);

networkRouter.post("/boxes/:id/ports", requireAdmin, postPortHandler);
networkRouter.patch("/ports/:id", requireAdmin, patchPortHandler);
networkRouter.delete("/ports/:id", requireAdmin, deletePortHandler);

networkRouter.post("/lines", requireAdmin, postLineHandler);
networkRouter.patch("/lines/:id", requireAdmin, patchLineHandler);
networkRouter.delete("/lines/:id", requireAdmin, deleteLineHandler);

networkRouter.post("/services", requireAdmin, postServiceHandler);
networkRouter.patch("/services/:id", requireAdmin, patchServiceHandler);
networkRouter.delete("/services/:id", requireAdmin, deleteServiceHandler);