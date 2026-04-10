import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseBody, iotPreferencesBodySchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/iot" });

export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "CSRF origin check failed" }, { status: 403 });
  }
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`iot:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const parsed = await parseBody(req, iotPreferencesBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const preferences = parsed.data.preferences;

    const service = createServiceClient();
    const { data: agent } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent?.id) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const { error } = await service
      .from("agent_state")
      .update({ iot_preferences: preferences })
      .eq("agent_id", agent.id);
    if (error) return NextResponse.json({ error: "Update failed" }, { status: 500 });
    return NextResponse.json({ ok: true, preferences });
  } catch (e) {
    log.error("iot POST", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const service = createServiceClient();
    const { data: agent } = await service.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent?.id) return NextResponse.json({ preferences: {} });
    const { data: state } = await service.from("agent_state").select("iot_preferences").eq("agent_id", agent.id).single();
    return NextResponse.json({ preferences: state?.iot_preferences ?? {} });
  } catch (e) {
    log.error("iot GET", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
