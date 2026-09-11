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
import { requireAuth } from "../middleware/auth.js";

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