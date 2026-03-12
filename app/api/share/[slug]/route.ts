import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveLocale } from "@/lib/i18n/config";
import { loadShareCardData } from "@/lib/share/card";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
    console.error("GET /api/share/[slug] error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
