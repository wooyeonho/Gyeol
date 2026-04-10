import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isClientEventName } from "@/lib/analytics/catalog";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { analyticsTrackBodySchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

function sanitizeString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

export async function POST(request: NextRequest) {
  try {
    if (!verifyCsrfOrigin(request)) {
      return NextResponse.json({ error: "CSRF origin check failed" }, { status: 403 });
    }

    const rl = await checkRateLimit("analytics-track:global");
    if (!rl) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = analyticsTrackBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid event_name" }, { status: 400 });
    }

    const { event_name, anonymous_id, locale, path, properties, session_id } = parsed.data;

    if (!isClientEventName(event_name)) {
      return NextResponse.json({ error: "Invalid event_name" }, { status: 400 });
    }

    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }

    const service = createServiceClient();
    await service.from("product_events").insert({
      anonymous_id: anonymous_id?.trim() || null,
      event_name,
      locale: locale?.trim() || null,
      path: path?.trim() || null,
      properties: properties ?? {},
      referrer: sanitizeString(request.headers.get("referer"), 512),
      session_id: session_id?.trim() || null,
      user_agent: sanitizeString(request.headers.get("user-agent"), 512),
      user_id: userId,
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    logger.error("POST /api/analytics/track error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
