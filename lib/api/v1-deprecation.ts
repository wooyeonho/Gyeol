import { NextResponse } from "next/server";

/**
 * V1 API deprecation utilities.
 *
 * The legacy env-based API key (GYEOL_ENGINE_API_KEY) is deprecated.
 * All V1 endpoints will be sunset on 2026-09-01.
 * Clients should migrate to database-bound API keys (api_keys table).
 */

/** ISO date when V1 legacy endpoints will be removed. */
const V1_SUNSET_DATE = "2026-09-01T00:00:00Z";

/**
 * Add RFC 8594 Sunset + Deprecation headers to a V1 API response.
 * Should be called on every V1 response to signal upcoming removal.
 */
export function addV1DeprecationHeaders(response: NextResponse): NextResponse {
  response.headers.set("Sunset", V1_SUNSET_DATE);
  response.headers.set("Deprecation", "true");
  response.headers.set(
    "Link",
    '</api/v2>; rel="successor-version"'
  );
  return response;
}

/**
 * Wrap a NextResponse with V1 deprecation headers and a deprecation notice in the body.
 */
export function v1JsonResponse(
  body: Record<string, unknown>,
  init?: { status?: number }
): NextResponse {
  const res = NextResponse.json(
    {
      ...body,
      _deprecation: {
        message: "This V1 API endpoint is deprecated and will be removed on 2026-09-01. Please migrate to database-bound API keys.",
        sunset: V1_SUNSET_DATE,
        migration_guide: "https://docs.gyeol.app/api/migration",
      },
    },
    init
  );
  return addV1DeprecationHeaders(res);
}
