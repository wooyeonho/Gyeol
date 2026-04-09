import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logRouteError } from "@/lib/ops/logger";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { pushSubscribeBodySchema, parseBody } from "@/lib/validation/schemas";

export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const parsed = await parseBody(req, pushSubscribeBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { subscription, agentId } = parsed.data;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await checkRateLimit(`push-subscribe:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const service = createServiceClient();
    
    if (agentId) {
      const { data: agents } = await service.from("agents").select("id").eq("id", agentId).eq("user_id", user.id).single();
      if (!agents) return NextResponse.json({ error: "Agent not owned by user" }, { status: 403 });
    }

    const { endpoint, keys } = subscription;
    const p256dh = keys?.p256dh || "";
    const auth = keys?.auth || "";

    const { data: existing } = await service.from("push_subscriptions").select("id").eq("endpoint", endpoint).single();
    if (existing) {
       await service.from("push_subscriptions").update({ user_id: user.id, agent_id: agentId || null, p256dh, auth, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
       await service.from("push_subscriptions").insert({ user_id: user.id, agent_id: agentId || null, endpoint, p256dh, auth });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    logRouteError("Push subscribe error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
