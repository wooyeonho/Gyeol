import { NextResponse } from "next/server";
import { isMissingEnvError } from "@/lib/env/required";

/**
 * Wraps an API route handler with consistent error handling.
 *
 * - Catches MissingEnvError → returns `demoFallback()` if provided, else 503.
 * - Catches all other errors → logs + returns 500.
 *
 * Usage:
 *   export const GET = safeHandler(async (req) => {
 *     // ... your logic
 *     return NextResponse.json({ data });
 *   });
 */
export function safeHandler(
  handler: (req: Request) => Promise<NextResponse>,
  options?: {
    /** Called when Supabase env vars are missing; return demo JSON. */
    demoFallback?: () => NextResponse;
    /** Label for error logs (e.g. "GET /api/activity"). */
    label?: string;
  }
) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      return await handler(req);
    } catch (error) {
      const label = options?.label ?? req.url;
      console.error(`[${label}]`, error);

      if (isMissingEnvError(error) && options?.demoFallback) {
        return options.demoFallback();
      }

      return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
  };
}
