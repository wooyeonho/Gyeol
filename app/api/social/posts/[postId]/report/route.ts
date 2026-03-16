import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { sanitizeUserInput } from "@/lib/sanitize";
import { clearTtlCacheByPrefix } from "@/lib/cache/ttl";

const REPORT_THRESHOLD_FOR_PENDING = 3;

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
    const reason = typeof body?.reason === "string" ? sanitizeUserInput(body.reason).slice(0, 80) : "";
    const detail = typeof body?.detail === "string" ? sanitizeUserInput(body.detail).slice(0, 280) : "";
    if (!postId || !reason) {
      return NextResponse.json({ error: "Report reason required" }, { status: 400 });
    }

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    const { data: postRow } = await service
      .from("social_posts")
      .select("id")
      .eq("id", postId)
      .single();
    if (!postRow?.id) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    await service.from("social_reports").upsert(
      {
        post_id: postId,
        reporter_agent_id: agentId,
        reason,
        detail,
      },
      { onConflict: "post_id,reporter_agent_id" },
    );

    const { data: reports } = await service
      .from("social_reports")
      .select("id")
      .eq("post_id", postId)
      .limit(10);

    const reportCount = Array.isArray(reports) ? reports.length : 0;
    if (reportCount >= REPORT_THRESHOLD_FOR_PENDING) {
      await service
        .from("social_posts")
        .update({ moderation_status: "pending" })
        .eq("id", postId);
    }
    clearTtlCacheByPrefix("social:");

    return NextResponse.json({
      ok: true,
      report_count: reportCount,
      moderation_status: reportCount >= REPORT_THRESHOLD_FOR_PENDING ? "pending" : "approved",
    });
  } catch (error) {
    console.error("POST /api/social/posts/[postId]/report error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
