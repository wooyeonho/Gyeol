import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import type { ControlPolicy } from "@/lib/creature-life/types";

const VALID_LEVELS = [0, 1, 2, 3] as const;

/** GET — return the current control policy (the leash state) */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const agentId = await ensurePrimaryAgent(service, user.id);

  const { data } = await service
    .from("agent_state")
    .select("config")
    .eq("agent_id", agentId)
    .single();

  const config = (data?.config as Record<string, unknown> | null) ?? {};
  const policy: ControlPolicy = {
    autonomyLevel: (VALID_LEVELS.includes(config.autonomy_level as typeof VALID_LEVELS[number])
      ? config.autonomy_level
      : 1) as ControlPolicy["autonomyLevel"],
    allowNotifications: config.autonomy_allow_notifications === true,
    allowPublicSuggestions: config.autonomy_allow_public === true,
    allowMoneyPressure: false,
    maxDailyInterruptions: typeof config.autonomy_max_interruptions === "number"
      ? config.autonomy_max_interruptions
      : 2,
    emergencyPause: config.autonomy_emergency_pause === true,
  };

  return NextResponse.json({ policy });
}

/** PATCH — update the leash. Users hold the leash. */
export async function PATCH(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if ("autonomyLevel" in body) {
    const level = body.autonomyLevel;
    if (!VALID_LEVELS.includes(level as typeof VALID_LEVELS[number])) {
      return NextResponse.json({ error: "autonomyLevel must be 0, 1, 2, or 3" }, { status: 400 });
    }
    patch.autonomy_level = level;
    // Level 0 = emergency pause (full stop)
    if (level === 0) patch.autonomy_emergency_pause = true;
    else if (body.autonomyLevel !== 0) patch.autonomy_emergency_pause = false;
  }

  if ("allowNotifications" in body) {
    patch.autonomy_allow_notifications = body.allowNotifications === true;
  }

  if ("allowPublicSuggestions" in body) {
    patch.autonomy_allow_public = body.allowPublicSuggestions === true;
  }

  if ("maxDailyInterruptions" in body) {
    const max = body.maxDailyInterruptions;
    if (typeof max !== "number" || max < 0 || max > 20) {
      return NextResponse.json({ error: "maxDailyInterruptions must be 0–20" }, { status: 400 });
    }
    patch.autonomy_max_interruptions = max;
  }

  if ("emergencyPause" in body) {
    patch.autonomy_emergency_pause = body.emergencyPause === true;
    if (body.emergencyPause) patch.autonomy_level = 0;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const service = createServiceClient();
  const agentId = await ensurePrimaryAgent(service, user.id);

  const { data: current } = await service
    .from("agent_state")
    .select("config")
    .eq("agent_id", agentId)
    .single();

  const currentConfig = (current?.config as Record<string, unknown> | null) ?? {};
  await service
    .from("agent_state")
    .update({ config: { ...currentConfig, ...patch } })
    .eq("agent_id", agentId);

  return NextResponse.json({ ok: true, applied: patch });
}
