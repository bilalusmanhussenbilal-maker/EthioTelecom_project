import { Router } from "express";
import { getSyncPullHandler, postSyncPushHandler } from "../controllers/sync.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const syncRouter = Router();

syncRouter.use(requireAuth, requireRole("TECHNICIAN"));

syncRouter.get("/pull", getSyncPullHandler);
syncRouter.post("/push", postSyncPushHandler);
