import { Router } from "express";
import { activityRouter } from "./activity.routes.js";
import { authRouter } from "./auth.routes.js";
import { healthRouter } from "./health.routes.js";
import { networkRouter } from "./network.routes.js";
import { reportRouter } from "./report.routes.js";
import { searchRouter } from "./search.routes.js";
import { settingsRouter } from "./settings.routes.js";
import { surveyRouter } from "./survey.routes.js";
import { syncRouter } from "./sync.routes.js";
import { technicianRouter } from "./technician.routes.js";
import { userRouter } from "./user.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/network", networkRouter);
apiRouter.use("/search", searchRouter);
apiRouter.use("/surveys", surveyRouter);
apiRouter.use("/sync", syncRouter);
apiRouter.use("/technicians", technicianRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/reports", reportRouter);
apiRouter.use("/activity-logs", activityRouter);
apiRouter.use("/settings", settingsRouter);