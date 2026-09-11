import type { RequestHandler } from "express";
import { z } from "zod";
import { getServiceNetworkPath, search } from "../services/search.service.js";
import { parseParams, parseQuery } from "../utils/validation.js";

const searchQuerySchema = z.object({
  q: z.string().trim().min(2, "must be at least 2 characters").max(120),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

const serviceCodeParams = z.object({ serviceCode: z.string().min(1).max(64) });

export const getSearchHandler: RequestHandler = async (req, res) => {
  const query = parseQuery(searchQuerySchema, req);
  res.status(200).json(await search(query.q, query.limit));
};

export const getServiceNetworkPathHandler: RequestHandler = async (req, res) => {
  const { serviceCode } = parseParams(serviceCodeParams, req);
  res.status(200).json(await getServiceNetworkPath(serviceCode));
};