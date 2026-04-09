import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isClientEventName } from "@/lib/analytics/catalog";
import { logger } from "@/lib/logger";

type AnalyticsPayload = {
  anonymous_id?: unknown;
  event_name?: unknown;
  locale?: unknown;
  path?: unknown;
  properties?: unknown;
  session_id?: unknown;
};

function sanitizeString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : null;
}

function sanitizeProperties(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as AnalyticsPayload;
    const eventName = sanitizeString(body.event_name, 64);
    if (!eventName || !isClientEventName(eventName)) {
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
      anonymous_id: sanitizeString(body.anonymous_id, 128),
      event_name: eventName,
      locale: sanitizeString(body.locale, 12),
      path: sanitizeString(body.path, 256),
      properties: sanitizeProperties(body.properties),
      referrer: sanitizeString(request.headers.get("referer"), 512),
      session_id: sanitizeString(body.session_id, 128),
      user_agent: sanitizeString(request.headers.get("user-agent"), 512),
      user_id: userId,
    });

    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    logger.error("POST /api/analytics/track error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
