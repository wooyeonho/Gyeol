import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { sanitizeUserInput } from "@/lib/sanitize";
import { clearTtlCacheByPrefix } from "@/lib/cache/ttl";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { parseBody, socialReportBodySchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

const REPORT_THRESHOLD_FOR_PENDING = 3;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`social-report:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const { postId } = await params;
    if (!postId) {
      return NextResponse.json({ error: "Post ID required" }, { status: 400 });
    }
    const parsed = await parseBody(req, socialReportBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const fenceCheck = checkElectricFence(`${parsed.data.reason} ${parsed.data.detail}`);
    if (fenceCheck.blocked) {
      return NextResponse.json({ error: "Blocked content detected" }, { status: 400 });
    }
    const reason = sanitizeUserInput(parsed.data.reason ?? "");
    const detail = sanitizeUserInput(parsed.data.detail ?? "");

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
    logger.error("POST /api/social/posts/[postId]/report error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
