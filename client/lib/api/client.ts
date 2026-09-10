const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api/v1";

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = "ApiError";
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const relativePath = path.startsWith("/") ? path : `/${path}`;
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) {
      search.set(key, String(value));
    }
  }

  const queryString = search.toString();
  return queryString ? `${base}${relativePath}?${queryString}` : `${base}${relativePath}`;
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function normalizeErrorPayload(data: unknown, status: number): ApiErrorPayload {
  if (isRecord(data) && isRecord(data.error)) {
    const { code, message, details } = data.error;

    return {
      code: typeof code === "string" ? code : `HTTP_${status}`,
      message: typeof message === "string" ? message : "The request failed",
      ...(details !== undefined ? { details } : {}),
    };
  }

  return { code: `HTTP_${status}`, message: "The request failed" };
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { body, query, headers, ...init } = options;

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    throw new ApiError(0, {
      code: "NETWORK_ERROR",
      message: "Could not reach the server. Check your connection and try again.",
      details: cause,
    });
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const text = await response.text();
  const data = text ? parseJson(text) : undefined;

  if (!response.ok) {
    throw new ApiError(response.status, normalizeErrorPayload(data, response.status));
  }

  return data as TResponse;
}

export const api = {
  get: <TResponse>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<TResponse>(path, { ...options, method: "GET" }),
  post: <TResponse>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<TResponse>(path, { ...options, method: "POST", body }),
  patch: <TResponse>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<TResponse>(path, { ...options, method: "PATCH", body }),
  delete: <TResponse>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<TResponse>(path, { ...options, method: "DELETE" }),
};
