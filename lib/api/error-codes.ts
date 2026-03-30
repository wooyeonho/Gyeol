import { NextResponse } from "next/server";

/**
 * Structured API error codes.
 * Every error response should use a machine-readable code + human-readable message.
 */
export const API_ERROR = {
  // Auth errors (401)
  UNAUTHORIZED: { code: "UNAUTHORIZED", message: "Authentication required", status: 401 },
  SESSION_EXPIRED: { code: "SESSION_EXPIRED", message: "Session has expired, please re-authenticate", status: 401 },
  INVALID_API_KEY: { code: "INVALID_API_KEY", message: "Invalid or revoked API key", status: 401 },

  // Authorization errors (403)
  FORBIDDEN: { code: "FORBIDDEN", message: "You do not have permission to access this resource", status: 403 },
  AGE_RESTRICTED: { code: "AGE_RESTRICTED", message: "This feature is restricted for your age group", status: 403 },
  CONSENT_REQUIRED: { code: "CONSENT_REQUIRED", message: "Parental consent is required", status: 403 },

  // Not found (404)
  NOT_FOUND: { code: "NOT_FOUND", message: "Resource not found", status: 404 },
  AGENT_NOT_FOUND: { code: "AGENT_NOT_FOUND", message: "Agent not found", status: 404 },

  // Validation errors (400)
  VALIDATION_ERROR: { code: "VALIDATION_ERROR", message: "Invalid request parameters", status: 400 },
  MISSING_FIELD: { code: "MISSING_FIELD", message: "Required field is missing", status: 400 },
  CONTENT_BLOCKED: { code: "CONTENT_BLOCKED", message: "Content was blocked by moderation", status: 400 },

  // Rate limiting (429)
  RATE_LIMITED: { code: "RATE_LIMITED", message: "Too many requests, please try again later", status: 429 },

  // Server errors (500)
  INTERNAL_ERROR: { code: "INTERNAL_ERROR", message: "An internal error occurred", status: 500 },
  SERVICE_UNAVAILABLE: { code: "SERVICE_UNAVAILABLE", message: "Service temporarily unavailable", status: 503 },
} as const;

export type ApiErrorCode = keyof typeof API_ERROR;

type ErrorDef = (typeof API_ERROR)[ApiErrorCode];

/**
 * Create a structured error response.
 * Response body format: { error: { code, message, details? } }
 */
export function apiError(
  errorDef: ErrorDef,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: errorDef.code,
        message: errorDef.message,
        ...(details ? { details } : {}),
      },
    },
    { status: errorDef.status }
  );
}

/**
 * Create a structured error response with a custom message override.
 */
export function apiErrorWithMessage(
  errorDef: ErrorDef,
  message: string,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code: errorDef.code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status: errorDef.status }
  );
}
