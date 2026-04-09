import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { clearTtlCacheByPrefix } from "@/lib/cache/ttl";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseBody, socialFollowBodySchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`social-follow:${user.id}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const parsed = await parseBody(req, socialFollowBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const targetAgentId = parsed.data.target_agent_id;

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });
    if (agentId === targetAgentId) {
      return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
    }

    await service.from("social_connections").upsert(
      {
        follower_agent_id: agentId,
        followee_agent_id: targetAgentId,
      },
      { onConflict: "follower_agent_id,followee_agent_id" },
    );
    clearTtlCacheByPrefix("social:");
    clearTtlCacheByPrefix("leaderboard:");

    return NextResponse.json({ ok: true, following: true, target_agent_id: targetAgentId });
  } catch (error) {
    logger.error("POST /api/social/follow error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`social-follow:${user.id}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const parsed = await parseBody(req, socialFollowBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const targetAgentId = parsed.data.target_agent_id;

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    await service
      .from("social_connections")
      .delete()
      .eq("follower_agent_id", agentId)
      .eq("followee_agent_id", targetAgentId);
    clearTtlCacheByPrefix("social:");
    clearTtlCacheByPrefix("leaderboard:");

    return NextResponse.json({ ok: true, following: false, target_agent_id: targetAgentId });
  } catch (error) {
    logger.error("DELETE /api/social/follow error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
