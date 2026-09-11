import type { RequestHandler } from "express";
import { z } from "zod";
import { getAuthContext } from "../middleware/auth.js";
import { getStatusCounts } from "../services/technician.service.js";
import {
  assignSurvey,
  createSurveyForActor,
  getSurveyDetail,
  getSurveyFormData,
  getSurveyTimeline,
  listSurveysForActor,
  reviewSurvey,
  saveFieldData,
  submitSurvey,
} from "../services/survey.service.js";
import { ApiError } from "../utils/api-error.js";
import { parseBody, parseParams, parseQuery } from "../utils/validation.js";

const idParams = z.object({ id: z.string().min(1) });

const surveyStatusSchema = z.enum(["NEW", "IN_PROGRESS", "COMPLETED", "RETURNED", "REJECTED"]);
const boxStatusSchema = z.enum(["ACTIVE", "FAULTY", "INACTIVE"]);
const portStatusSchema = z.enum(["AVAILABLE", "OCCUPIED", "FAULTY"]);
const lineStatusSchema = z.enum(["ACTIVE", "FAULTY", "INACTIVE"]);
const changeTypeSchema = z.enum(["NEW_CONNECTION", "LINE_SHIFT", "VERIFICATION"]);

const listQuerySchema = z.object({
  status: surveyStatusSchema.optional(),
  technicianId: z.string().min(1).optional(),
  serviceId: z.string().min(1).optional(),
  areaId: z.string().min(1).optional(),
  serviceCode: z.string().min(1).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const createSurveySchema = z.object({
  serviceId: z.string().min(1),
  technicianId: z.string().min(1).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
  changeType: changeTypeSchema.optional(),
  newBoxId: z.string().min(1).nullable().optional(),
  newPortId: z.string().min(1).nullable().optional(),
  newLineId: z.string().min(1).nullable().optional(),
  requiredCapacity: z.coerce.number().int().min(0).max(10_000).nullable().optional(),
});

const assignSurveySchema = z.object({
  technicianId: z.string().min(1),
  dueDate: z.coerce.date().nullable().optional(),
  note: z.string().trim().max(500).nullable().optional(),
});

const networkTargetSchema = {
  newBoxId: z.string().min(1).nullable().optional(),
  newPortId: z.string().min(1).nullable().optional(),
  newLineId: z.string().min(1).nullable().optional(),
  requiredCapacity: z.coerce.number().int().min(0).max(10_000).nullable().optional(),
};

const fieldDataSchema = z.object({
  ...networkTargetSchema,
  boxStatus: boxStatusSchema.nullable().optional(),
  portStatus: portStatusSchema.nullable().optional(),
  lineStatus: lineStatusSchema.nullable().optional(),
  availableCapacity: z.coerce.number().int().min(0).max(100_000).nullable().optional(),
  technicianRemark: z.string().trim().max(2000).nullable().optional(),
});

const submitSchema = z.object({
  ...networkTargetSchema,
  boxStatus: boxStatusSchema.nullable().optional(),
  portStatus: portStatusSchema.nullable().optional(),
  lineStatus: lineStatusSchema.nullable().optional(),
  availableCapacity: z.coerce.number().int().min(0).max(100_000).nullable().optional(),
  technicianRemark: z.string().trim().max(2000).nullable().optional(),
  gps: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().positive().max(100_000),
    capturedAt: z.coerce.date().optional(),
  }),
});

const reviewSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT", "RETURN"]),
  remark: z.string().trim().max(2000).nullable().optional(),
});

export const listSurveysHandler: RequestHandler = async (req, res) => {
  const query = parseQuery(listQuerySchema, req);
  const actor = getAuthContext(req);

  const result = await listSurveysForActor(
    actor,
    {
      ...(query.status === undefined ? {} : { status: query.status }),
      ...(query.technicianId === undefined ? {} : { technicianId: query.technicianId }),
      ...(query.serviceId === undefined ? {} : { serviceId: query.serviceId }),
      ...(query.areaId === undefined ? {} : { areaId: query.areaId }),
      ...(query.serviceCode === undefined ? {} : { serviceCode: query.serviceCode }),
      ...(query.search === undefined ? {} : { search: query.search }),
    },
    { page: query.page, pageSize: query.pageSize },
  );

  res.status(200).json(result);
};

/**
 * Status counts for the queue header. Technicians get their own totals, supervisors and
 * administrators get the whole organisation.
 */
export const getSurveySummaryHandler: RequestHandler = async (req, res) => {
  const actor = getAuthContext(req);
  const technicianId = actor.role === "TECHNICIAN" ? actor.technicianId : undefined;

  if (actor.role === "TECHNICIAN" && !technicianId) {
    throw ApiError.forbidden("This account is not linked to a technician profile");
  }

  res.status(200).json({ counts: await getStatusCounts(technicianId) });
};

export const getSurveyHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const survey = await getSurveyDetail(id, getAuthContext(req));

  res.status(200).json({ survey });
};

export const getSurveyFormDataHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);

  res.status(200).json(await getSurveyFormData(id, getAuthContext(req)));
};

export const getSurveyTimelineHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const activity = await getSurveyTimeline(id, getAuthContext(req));

  res.status(200).json({ activity });
};

export const postSurveyHandler: RequestHandler = async (req, res) => {
  const body = parseBody(createSurveySchema, req);
  const survey = await createSurveyForActor(body, getAuthContext(req));

  res.status(201).json({ survey });
};

export const postSurveyAssignmentHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(assignSurveySchema, req);
  const survey = await assignSurvey(id, body, getAuthContext(req));

  res.status(200).json({ survey });
};

export const patchSurveyFieldDataHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(fieldDataSchema, req);

  res.status(200).json(await saveFieldData(id, body, getAuthContext(req)));
};

export const postSurveySubmitHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(submitSchema, req);

  res.status(200).json({ survey: await submitSurvey(id, body, getAuthContext(req)) });
};

export const postSurveyReviewHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const body = parseBody(reviewSchema, req);
  const survey = await reviewSurvey(id, body, getAuthContext(req));

  res.status(200).json({ survey });
};