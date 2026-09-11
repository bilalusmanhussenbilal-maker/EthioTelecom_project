import type { Request } from "express";
import type { ZodType } from "zod";
import { ApiError } from "./api-error.js";

interface ValidationIssue {
  path: string;
  message: string;
}

function toIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }, scope: string): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: [scope, ...issue.path.map(String)].filter(Boolean).join("."),
    message: issue.message,
  }));
}

function parseWith<T>(schema: ZodType<T>, value: unknown, scope: string): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw ApiError.unprocessable("The request contains invalid data", {
      code: "VALIDATION_ERROR",
      details: toIssues(result.error, scope),
    });
  }

  return result.data;
}

export function parseBody<T>(schema: ZodType<T>, req: Request): T {
  return parseWith(schema, req.body, "body");
}

export function parseQuery<T>(schema: ZodType<T>, req: Request): T {
  return parseWith(schema, req.query, "query");
}

export function parseParams<T>(schema: ZodType<T>, req: Request): T {
  return parseWith(schema, req.params, "params");
}
