import { NextResponse } from "next/server";
import type { ZodIssue } from "zod";

/**
 * Create a success response matching the API envelope format
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ status: "success", data }, { status });
}

/**
 * Create an error response matching the API envelope format
 */
export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ status: "error", message }, { status });
}

/**
 * Create a validation error response with field-level details
 */
export function validationErrorResponse(errors: ZodIssue[]) {
  return NextResponse.json(
    {
      status: "error",
      message: "Validation failed",
      errors: errors.map((issue) => ({
        field: issue.path.join(".") || "root",
        message: issue.message,
      })),
    },
    { status: 400 }
  );
}

/**
 * Create a not found error response
 */
export function notFoundResponse(message = "Resource not found") {
  return errorResponse(message, 404);
}

/**
 * Create a conflict error response
 */
export function conflictResponse(message: string) {
  return errorResponse(message, 409);
}

/**
 * Create a no content response (204)
 */
export function noContentResponse() {
  return new NextResponse(null, { status: 204 });
}

/**
 * Create an unauthorized error response (401)
 */
export function unauthorizedResponse(message = "Authentication required") {
  return errorResponse(message, 401);
}

/**
 * Create a rate limit error response (429)
 */
export function rateLimitErrorResponse(
  message = "Too many requests",
  retryAfter?: number
) {
  const headers: HeadersInit = {};
  if (retryAfter) {
    headers["Retry-After"] = String(Math.ceil(retryAfter));
  }

  return NextResponse.json(
    {
      status: "error",
      message,
      retryAfter: retryAfter ? Math.ceil(retryAfter) : undefined,
    },
    { status: 429, headers }
  );
}

/**
 * Create a forbidden error response (403)
 */
export function forbiddenResponse(message = "Access denied") {
  return errorResponse(message, 403);
}
