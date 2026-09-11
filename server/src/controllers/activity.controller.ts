import type { RequestHandler } from "express";
import { z } from "zod";
import { countActivities, listActivities } from "../services/activity-log.service.js";
import { paginate } from "../utils/pagination.js";
import { parseQuery } from "../utils/validation.js";

const listQuerySchema = z.object({
  userId: z.string().min(1).optional(),
  surveyId: z.string().min(1).optional(),
  action: z.string().min(1).max(64).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const listActivityHandler: RequestHandler = async (req, res) => {
  const query = parseQuery(listQuerySchema, req);

  const filter = {
    ...(query.userId === undefined ? {} : { userId: query.userId }),
    ...(query.surveyId === undefined ? {} : { surveyId: query.surveyId }),
    ...(query.action === undefined ? {} : { action: query.action }),
    ...(query.search === undefined ? {} : { search: query.search }),
    ...(query.from === undefined ? {} : { from: query.from }),
    ...(query.to === undefined ? {} : { to: query.to }),
  };

  const [items, total] = await Promise.all([
    listActivities(filter, { skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    countActivities(filter),
  ]);

  res.status(200).json(paginate(items, query.page, query.pageSize, total));
};