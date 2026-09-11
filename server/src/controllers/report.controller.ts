import type { RequestHandler } from "express";
import { z } from "zod";
import {
  buildAllReports,
  buildReport,
  isReportKey,
  reportToCsv,
  REPORT_KEYS,
  type ReportFilters,
} from "../services/report.service.js";
import { ApiError } from "../utils/api-error.js";
import { parseParams, parseQuery } from "../utils/validation.js";

const keyParams = z.object({ key: z.string().min(1) });

const reportQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  areaId: z.string().min(1).optional(),
});

const exportQuerySchema = reportQuerySchema.extend({
  format: z.enum(["json", "csv"]).default("csv"),
});

function toFilters(query: z.infer<typeof reportQuerySchema>): ReportFilters {
  return {
    ...(query.from === undefined ? {} : { from: query.from }),
    ...(query.to === undefined ? {} : { to: query.to }),
    ...(query.areaId === undefined ? {} : { areaId: query.areaId }),
  };
}

export const listReportsHandler: RequestHandler = async (req, res) => {
  const query = parseQuery(reportQuerySchema, req);
  const tables = await buildAllReports(toFilters(query));

  res.status(200).json({ reports: tables, available: REPORT_KEYS });
};

export const getReportHandler: RequestHandler = async (req, res) => {
  const { key } = parseParams(keyParams, req);

  if (!isReportKey(key)) {
    throw ApiError.notFound(`Unknown report "${key}"`);
  }

  const query = parseQuery(reportQuerySchema, req);

  res.status(200).json({ report: await buildReport(key, toFilters(query)) });
};

export const exportReportHandler: RequestHandler = async (req, res) => {
  const { key } = parseParams(keyParams, req);

  if (!isReportKey(key)) {
    throw ApiError.notFound(`Unknown report "${key}"`);
  }

  const query = parseQuery(exportQuerySchema, req);
  const table = await buildReport(key, toFilters(query));

  if (query.format === "json") {
    res.status(200).json({ report: table });
    return;
  }

  const filename = `${table.key}-${table.generatedAt.slice(0, 10)}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.status(200).send(reportToCsv(table));
};