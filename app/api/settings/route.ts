import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getResolvedBillingState } from "@/lib/billing/service";
import { NextRequest, NextResponse } from "next/server";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { normalizeLocale } from "@/lib/i18n/config";
import { isFontSize, isThemeMode } from "@/lib/theme/preferences";
import { isAgeGroup, isMinorAgeGroup } from "@/lib/safety/age-gate";
import { logRouteError } from "@/lib/ops/logger";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { parseBody, settingsPatchBodySchema } from "@/lib/validation/schemas";

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
    logRouteError("GET /api/settings error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = await parseBody(request, settingsPatchBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const body = parsed.data;
    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 400 });

    const { data: state } = await service.from("agent_state").select("config").eq("agent_id", agentId).single();
    const config = (state?.config as Record<string, unknown>) ?? {};
    if (typeof body.autonomous_enabled === "boolean") config.autonomous_enabled = body.autonomous_enabled;
    if (typeof body.dream_enabled === "boolean") config.dream_enabled = body.dream_enabled;
    if (typeof body.social_enabled === "boolean") config.social_enabled = body.social_enabled;
    if (isAgeGroup(body.age_group)) config.age_group = body.age_group;
    if (typeof body.guardian_consent === "boolean") config.guardian_consent = body.guardian_consent;
    const effectiveAgeGroup = isAgeGroup(body.age_group)
      ? body.age_group
      : (isAgeGroup(config.age_group) ? config.age_group : null);
    if (typeof body.social_public_enabled === "boolean") {
      config.social_public_enabled = !isMinorAgeGroup(effectiveAgeGroup) && body.social_public_enabled;
    } else if (isMinorAgeGroup(effectiveAgeGroup)) {
      config.social_public_enabled = false;
    }
    if (typeof body.allow_cross_message === "boolean") config.allow_cross_message = body.allow_cross_message;
    if (typeof body.performance_minimal === "boolean") config.performance_minimal = body.performance_minimal;
    if (isThemeMode(body.preferred_theme)) config.preferred_theme = body.preferred_theme;
    if (typeof body.high_contrast_enabled === "boolean") config.high_contrast_enabled = body.high_contrast_enabled;
    if (isFontSize(body.font_size)) config.font_size = body.font_size;
    if (typeof body.reduce_motion === "boolean") config.reduce_motion = body.reduce_motion;
    if (typeof body.personality_mode === "string" && body.personality_mode.trim()) {
      const fence = checkElectricFence(body.personality_mode);
      if (fence.blocked) {
        return NextResponse.json({ error: fence.reason || "Blocked content" }, { status: 400 });
      }
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
    logRouteError("PATCH /api/settings error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
