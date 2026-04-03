import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";

export const dynamic = "force-dynamic";

/**
 * POST /api/reward/track
 *
 * Fire-and-forget endpoint called by the reward middleware after
 * granting a reward. Persists `last_reward_at` in agent_state.config
 * so the reward expiry countdown has an accurate server-side timestamp.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) {
      return NextResponse.json({ ok: false });
    }

    const { data: state } = await service
      .from("agent_state")
      .select("config")
      .eq("agent_id", agentId)
      .single();

    const config = ((state?.config as Record<string, unknown>) ?? {});
    await service
      .from("agent_state")
      .update({
        config: {
          ...config,
          last_reward_at: new Date().toISOString(),
        },
      })
      .eq("agent_id", agentId);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
