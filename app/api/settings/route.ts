import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getResolvedBillingState } from "@/lib/billing/service";
import { NextRequest, NextResponse } from "next/server";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { normalizeLocale } from "@/lib/i18n/config";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ state: null });

    const [{ data: state }, { data: connRows }] = await Promise.all([
      service.from("agent_state").select("*").eq("agent_id", agentId).single(),
      service.from("user_connections").select("service").eq("user_id", user.id),
    ]);
    const connections: Record<string, boolean> = {};
    for (const row of connRows ?? []) {
      const r = row as { service: string };
      connections[r.service] = true;
    }
    const stateData = state as (Record<string, unknown> & { channels?: Record<string, unknown> }) | null;
    if (stateData?.channels?.telegram) connections.telegram = true;
    return NextResponse.json({ state: stateData ?? null, connections });
  } catch (e) {
    console.error("GET /api/settings error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 400 });

    const { data: state } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
    const config = (state?.config as Record<string, unknown>) ?? {};
    if (typeof body.autonomous_enabled === "boolean") config.autonomous_enabled = body.autonomous_enabled;
    if (typeof body.dream_enabled === "boolean") config.dream_enabled = body.dream_enabled;
    if (typeof body.social_enabled === "boolean") config.social_enabled = body.social_enabled;
    if (typeof body.allow_cross_message === "boolean") config.allow_cross_message = body.allow_cross_message;
    if (typeof body.performance_minimal === "boolean") config.performance_minimal = body.performance_minimal;
    if (typeof body.personality_mode === "string" && body.personality_mode.trim()) {
      config.personality_mode = body.personality_mode.trim();
    }
    if (typeof body.preferred_locale === "string") {
      const preferredLocale = normalizeLocale(body.preferred_locale);
      if (preferredLocale) config.preferred_locale = preferredLocale;
    }

    const updates: Record<string, unknown> = { config };
    const { data: stateRow } = await service.from("agent_state").select("channels").eq("agent_id", agentId).single();
    let channels = (stateRow?.channels as Record<string, unknown>) ?? {};
    if (typeof body.telegram_chat_id === "string" && body.telegram_chat_id.trim()) {
      const billing = await getResolvedBillingState(service, user.id);
      if (!billing.entitlements.multichannel) {
        return NextResponse.json({ error: "Telegram channel requires Premium plan", code: "ENTITLEMENT_REQUIRED" }, { status: 403 });
      }
      channels = { ...channels, telegram: body.telegram_chat_id.trim() };
    }
    if (typeof body.recap_email === "boolean") {
      channels = { ...channels, email: body.recap_email };
    }
    if (Object.keys(channels).length > 0) updates.channels = channels;

    await service.from("agent_state").update(updates).eq("agent_id", agentId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/settings error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
