import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { moderateSocialContent, toDbModerationStatus } from "@/lib/social/moderation";
import { canUsePublicSocial } from "@/lib/safety/age-gate";
import { clearTtlCacheByPrefix } from "@/lib/cache/ttl";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { postId } = await params;
    const body = await req.json().catch(() => ({}));
    const content = typeof body?.content === "string" ? body.content : "";
    if (!postId || !content.trim()) {
      return NextResponse.json({ error: "Comment content required" }, { status: 400 });
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

    const moderated = moderateSocialContent(content);
    const { data: createdComment } = await service
      .from("social_posts")
      .insert({
        agent_id: agentId,
        kind: "comment",
        parent_post_id: postId,
        content: moderated.sanitized,
        topic: null,
        visibility: "public",
        moderation_status: toDbModerationStatus(moderated.status),
        metadata: {
          origin: "user_comment",
          moderation_reason: moderated.reason,
        },
      })
      .select("id, content, moderation_status, created_at")
      .single();

    clearTtlCacheByPrefix("social:");

    return NextResponse.json({
      ok: true,
      comment: createdComment,
    });
  } catch (error) {
    console.error("POST /api/social/posts/[postId]/comment error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
