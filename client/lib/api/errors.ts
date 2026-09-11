import { ApiError } from "./client";

export interface FieldIssue {
  path: string;
  message: string;
}

function isFieldIssue(value: unknown): value is FieldIssue {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as FieldIssue).path === "string" &&
    typeof (value as FieldIssue).message === "string"
  );
}

/** The backend returns validation failures as `details: [{ path, message }]`. */
export function fieldIssuesOf(error: ApiError | null | undefined): FieldIssue[] {
  if (!error || !Array.isArray(error.details)) {
    return [];
  }

  return error.details.filter(isFieldIssue);
}

export function issueFor(error: ApiError | null | undefined, field: string): string | undefined {
  return fieldIssuesOf(error).find((issue) => issue.path === field || issue.path.endsWith(`.${field}`))?.message;
}

export function toApiError(cause: unknown, fallbackMessage = "Something went wrong"): ApiError {
  return cause instanceof ApiError
    ? cause
    : new ApiError(0, { code: "UNKNOWN", message: fallbackMessage });
}

/** Strips the `body.` / `query.` scope prefix the backend adds to issue paths. */
export function shortFieldName(path: string): string {
  return path.replace(/^(body|query|params)\./, "");
}