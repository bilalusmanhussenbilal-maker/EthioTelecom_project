import { Router } from "express";
import {
  getSurveyFormDataHandler,
  postFeasibilityCheckHandler,
  getSurveyHandler,
  getSurveySummaryHandler,
  getSurveyTimelineHandler,
  listSurveysHandler,
  patchSurveyFieldDataHandler,
  postSurveyAssignmentHandler,
  postSurveyHandler,
  postSurveyReviewHandler,
  postSurveySubmitHandler,
} from "../controllers/survey.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const surveyRouter = Router();

surveyRouter.use(requireAuth);

surveyRouter.get("/", listSurveysHandler);
surveyRouter.post("/", requireRole("SUPERVISOR", "ADMIN"), postSurveyHandler);

surveyRouter.get("/summary", getSurveySummaryHandler);

// Declared before "/:id" routes so the literal path is not swallowed by the id parameter.
surveyRouter.post("/feasibility-check", postFeasibilityCheckHandler);

surveyRouter.get("/:id", getSurveyHandler);
surveyRouter.get("/:id/form-data", getSurveyFormDataHandler);
surveyRouter.get("/:id/timeline", getSurveyTimelineHandler);

surveyRouter.post("/:id/assign", requireRole("SUPERVISOR", "ADMIN"), postSurveyAssignmentHandler);
surveyRouter.patch("/:id/field-data", requireRole("TECHNICIAN"), patchSurveyFieldDataHandler);
surveyRouter.post("/:id/submit", requireRole("TECHNICIAN"), postSurveySubmitHandler);
surveyRouter.post("/:id/review", requireRole("SUPERVISOR", "ADMIN"), postSurveyReviewHandler);