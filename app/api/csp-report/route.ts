import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * CSP Violation Report collector.
 * Browsers POST here automatically when a Content-Security-Policy violation occurs.
 * Violations are logged via the structured logger (picked up by Sentry / log drains).
 *
 * Spec: https://www.w3.org/TR/CSP3/#deprecated-serialize-violation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const report = JSON.parse(body);

    // Reporting API v1 wraps in { age, body, type, url, user_agent }
    // Legacy report-uri sends { "csp-report": { ... } } directly
    const violation =
      report?.body ??
      report?.["csp-report"] ??
      report;

    logger.warn("CSP violation", {
      blockedUri: violation?.["blocked-uri"] ?? violation?.blockedURL,
      violatedDirective:
        violation?.["violated-directive"] ?? violation?.effectiveDirective,
      documentUri: violation?.["document-uri"] ?? violation?.documentURL,
      disposition: violation?.disposition,
      originalPolicy: violation?.["original-policy"] ?? violation?.originalPolicy,
      sourceFile: violation?.["source-file"] ?? violation?.sourceFile,
      lineNumber: violation?.["line-number"] ?? violation?.lineNumber,
    });
  } catch {
    // Ignore parse errors — don't crash on malformed reports
  }

  // 204 No Content is the correct response for CSP reports
  return new NextResponse(null, { status: 204 });
}
