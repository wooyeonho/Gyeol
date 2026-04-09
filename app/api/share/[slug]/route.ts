import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveLocale } from "@/lib/i18n/config";
import { loadShareCardData } from "@/lib/share/card";
import { logger } from "@/lib/logger";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // S-5: Validate slug is a valid UUID to prevent enumeration / path traversal
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(slug)) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const locale = resolveLocale({
      acceptLanguage: request.headers.get("accept-language"),
      cookieHeader: request.headers.get("cookie"),
      explicitLocale: new URL(request.url).searchParams.get("locale"),
    });
    const service = createServiceClient();
    const data = await loadShareCardData(service, slug, locale);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (e) {
    logger.error("GET /api/share/[slug] error", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
