import type { RequestHandler } from "express";
import { z } from "zod";
import {
  getArea,
  getAreas,
  getAvailablePorts,
  getBox,
  getBoxByCode,
  getBoxes,
  getFormOptions,
  getLine,
  getLines,
  getPorts,
  getService,
  getServiceByCode,
  getServices,
} from "../services/network.service.js";
import { parseParams, parseQuery } from "../utils/validation.js";

const idParams = z.object({ id: z.string().min(1) });
const codeParams = z.object({ code: z.string().min(1) });

const areaFilterQuery = z.object({ areaId: z.string().min(1).optional() });
const boxFilterQuery = z.object({
  areaId: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "FAULTY", "INACTIVE"]).optional(),
});
const portStatusQuery = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED", "FAULTY"]).optional(),
});
const serviceFilterQuery = z.object({
  areaId: z.string().min(1).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "TERMINATED"]).optional(),
});

export const getAreasHandler: RequestHandler = async (_req, res) => {
  res.status(200).json({ areas: await getAreas() });
};

export const getAreaHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  res.status(200).json({ area: await getArea(id) });
};

export const getBoxesHandler: RequestHandler = async (req, res) => {
  const query = parseQuery(boxFilterQuery, req);
  res.status(200).json({ boxes: await getBoxes(query) });
};

export const getBoxHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  res.status(200).json({ box: await getBox(id) });
};

export const getBoxByCodeHandler: RequestHandler = async (req, res) => {
  const { code } = parseParams(codeParams, req);
  res.status(200).json({ box: await getBoxByCode(code) });
};

export const getBoxPortsHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  const query = parseQuery(portStatusQuery, req);
  res.status(200).json({ ports: await getPorts(id, query.status) });
};

export const getAvailablePortsHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  res.status(200).json(await getAvailablePorts(id));
};

export const getLinesHandler: RequestHandler = async (req, res) => {
  const query = parseQuery(areaFilterQuery, req);
  res.status(200).json({ lines: await getLines(query) });
};

export const getLineHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  res.status(200).json({ line: await getLine(id) });
};

export const getServicesHandler: RequestHandler = async (req, res) => {
  const query = parseQuery(serviceFilterQuery, req);
  res.status(200).json({ services: await getServices(query) });
};

export const getServiceHandler: RequestHandler = async (req, res) => {
  const { id } = parseParams(idParams, req);
  res.status(200).json({ service: await getService(id) });
};

export const getServiceByCodeHandler: RequestHandler = async (req, res) => {
  const { code } = parseParams(codeParams, req);
  res.status(200).json({ service: await getServiceByCode(code) });
};

export const getFormOptionsHandler: RequestHandler = async (req, res) => {
  const query = parseQuery(areaFilterQuery, req);
  res.status(200).json(await getFormOptions(query));
};