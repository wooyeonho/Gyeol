import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { encryptSecret } from "@/lib/security/secret-crypto";
import { getResolvedBillingState } from "@/lib/billing/service";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

const log = logger.child({ route: "api/integrations/calendar" });

export async function POST(request: NextRequest) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const service = createServiceClient();
    const billing = await getResolvedBillingState(service, user.id);
    if (!billing.entitlements.multichannel) {
      return NextResponse.json({ error: "Multichannel integrations require Premium plan", code: "ENTITLEMENT_REQUIRED" }, { status: 403 });
    }
    const allowed = await checkRateLimit(`integration-calendar-post:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const body = await request.json().catch(() => ({}));
    const accessToken = typeof body?.access_token === "string" ? body.access_token : null;
    if (!accessToken) return NextResponse.json({ error: "access_token required" }, { status: 400 });
    const encrypted = encryptSecret(accessToken);
    if (!encrypted) {
      return NextResponse.json({ error: "Service not configured: CONNECTION_TOKEN_KEY" }, { status: 503 });
    }

    await service.from("user_connections").upsert(
      {
        user_id: user.id,
        service: "calendar",
        token_encrypted: encrypted,
        metadata: {},
      },
      { onConflict: "user_id,service" }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    log.error("POST failed", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
