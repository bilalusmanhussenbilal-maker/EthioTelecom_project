export interface ApiErrorOptions {
  code?: string;
  details?: unknown;
  cause?: unknown;
}

const DEFAULT_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
  503: "SERVICE_UNAVAILABLE",
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, options: ApiErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = options.code ?? DEFAULT_CODES[statusCode] ?? "ERROR";

    if (options.details !== undefined) {
      this.details = options.details;
    }
  }

  static badRequest(message: string, options?: ApiErrorOptions): ApiError {
    return new ApiError(400, message, options);
  }

  static unauthorized(message = "Authentication is required", options?: ApiErrorOptions): ApiError {
    return new ApiError(401, message, options);
  }

  static forbidden(message = "You do not have access to this resource", options?: ApiErrorOptions): ApiError {
    return new ApiError(403, message, options);
  }

  static notFound(message = "Resource not found", options?: ApiErrorOptions): ApiError {
    return new ApiError(404, message, options);
  }

  static conflict(message: string, options?: ApiErrorOptions): ApiError {
    return new ApiError(409, message, options);
  }

  static unprocessable(message: string, options?: ApiErrorOptions): ApiError {
    return new ApiError(422, message, options);
  }

  static internal(message = "Something went wrong", options?: ApiErrorOptions): ApiError {
    return new ApiError(500, message, options);
  }

  static serviceUnavailable(message = "Service temporarily unavailable", options?: ApiErrorOptions): ApiError {
    return new ApiError(503, message, options);
  }
}
