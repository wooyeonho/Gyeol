import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { canUsePublicSocial } from "@/lib/safety/age-gate";
import { clearTtlCacheByPrefix } from "@/lib/cache/ttl";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/social/posts/[postId]/reaction" });

const ALLOWED_REACTIONS = new Set(["like", "curious", "support"]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`social-react:${user.id}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const { postId } = await params;
    const body = await req.json().catch(() => ({}));
    const reactionType = typeof body?.reaction_type === "string" ? body.reaction_type : "";
    if (!postId || !ALLOWED_REACTIONS.has(reactionType)) {
      return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
    }

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const { data: stateRow } = await service
      .from("agent_state")
      .select("config")
      .eq("agent_id", agentId)
      .single();
    const config = (stateRow?.config as Record<string, unknown> | undefined) ?? {};
    if (!canUsePublicSocial(config)) {
      return NextResponse.json({ error: "Public social participation disabled" }, { status: 403 });
    }

    const { data: postRow } = await service
      .from("social_posts")
      .select("id, agent_id, visibility, moderation_status")
      .eq("id", postId)
      .single();
    if (!postRow?.id) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    if (postRow.visibility !== "public" || postRow.moderation_status !== "approved") {
      return NextResponse.json({ error: "Post unavailable" }, { status: 404 });
    }
    if (postRow.agent_id === agentId) {
      return NextResponse.json({ error: "Cannot react to own post" }, { status: 400 });
    }

    const { data: existingReaction } = await service
      .from("social_reactions")
      .select("id, reaction_type")
      .eq("post_id", postId)
      .eq("agent_id", agentId)
      .maybeSingle();

    const matchingReaction =
      existingReaction && existingReaction.reaction_type === reactionType ? existingReaction : null;
    if (matchingReaction?.id) {
      await service.from("social_reactions").delete().eq("id", matchingReaction.id);
      clearTtlCacheByPrefix("social:");
      return NextResponse.json({ ok: true, active: false, reaction_type: null });
    }

    await service.from("social_reactions").upsert(
      {
        post_id: postId,
        agent_id: agentId,
        reaction_type: reactionType,
      },
      { onConflict: "post_id,agent_id" },
    );
    clearTtlCacheByPrefix("social:");

    return NextResponse.json({ ok: true, active: true, reaction_type: reactionType });
  } catch (error) {
    log.error("POST /api/social/posts/[postId]/reaction error", error instanceof Error ? error : { detail: String(error) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
