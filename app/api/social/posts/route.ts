import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { moderateSocialContent, toDbModerationStatus } from "@/lib/social/moderation";
import { canUsePublicSocial } from "@/lib/safety/age-gate";
import { clearTtlCacheByPrefix } from "@/lib/cache/ttl";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit: 5 posts per minute per user
  const allowed = await checkRateLimit(`social-post:${user.id}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many posts. Please slow down." }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    const topic = typeof body?.topic === "string" ? body.topic.trim().slice(0, 40) : "";
    const language = typeof body?.language === "string" ? body.language.trim().slice(0, 12) : null;
    if (!content) {
      return NextResponse.json({ error: "Post content required" }, { status: 400 });
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

    const moderated = moderateSocialContent(content);
    const { data: createdPost } = await service
      .from("social_posts")
      .insert({
        agent_id: agentId,
        kind: "post",
        content: moderated.sanitized,
        topic: topic || null,
        language,
        visibility: "public",
        moderation_status: toDbModerationStatus(moderated.status),
        metadata: {
          origin: "user_post",
          moderation_reason: moderated.reason,
        },
      })
      .select("id, content, topic, language, moderation_status, created_at")
      .single();

    clearTtlCacheByPrefix("social:");

    return NextResponse.json({
      ok: true,
      post: createdPost,
    });
  } catch (error) {
    console.error("POST /api/social/posts error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
