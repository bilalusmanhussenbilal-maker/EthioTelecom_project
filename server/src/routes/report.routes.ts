import { Router } from "express";
import {
  exportReportHandler,
  getReportHandler,
  listReportsHandler,
} from "../controllers/report.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const reportRouter = Router();

reportRouter.use(requireAuth, requireRole("SUPERVISOR", "ADMIN"));

reportRouter.get("/", listReportsHandler);
reportRouter.get("/:key", getReportHandler);
reportRouter.get("/:key/export", exportReportHandler);