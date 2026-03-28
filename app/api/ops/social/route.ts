import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isOpsAdminUserAsync, logOpsAudit } from "@/lib/security/ops-access";

type ReportRow = {
  id: string;
  post_id: string;
  reporter_agent_id: string;
  reason: string;
  detail?: string | null;
  status: string;
  created_at: string;
};

type PostRow = {
  id: string;
  agent_id: string;
  topic?: string | null;
  content: string;
  moderation_status: string;
  visibility: string;
  created_at: string;
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isOpsAdminUserAsync(user))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  logOpsAudit({ userId: user.id, action: "ops:social:view" });

  try {
    const service = createServiceClient();
    const { data: reportRows } = await service
      .from("social_reports")
      .select("id, post_id, reporter_agent_id, reason, detail, status, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    const reports = ((reportRows ?? []) as ReportRow[]).filter((row) => row.status === "open");
    const postIds = Array.from(new Set(reports.map((row) => row.post_id)));
    const reporterIds = Array.from(new Set(reports.map((row) => row.reporter_agent_id)));

    const [postRes, reporterRes] = await Promise.all([
      postIds.length > 0
        ? service
            .from("social_posts")
            .select("id, agent_id, content, topic, moderation_status, visibility, created_at")
            .in("id", postIds)
        : Promise.resolve({ data: [] }),
      reporterIds.length > 0
        ? service
            .from("agent_state")
            .select("agent_id, self_name")
            .in("agent_id", reporterIds)
        : Promise.resolve({ data: [] }),
    ]);

    const postsById = ((postRes.data ?? []) as PostRow[]).reduce((acc, post) => {
      acc[post.id] = post;
      return acc;
    }, {} as Record<string, PostRow>);

    const reporterNames = ((reporterRes.data ?? []) as Array<{ agent_id: string; self_name?: string | null }>).reduce((acc, row) => {
      acc[row.agent_id] = row.self_name ?? null;
      return acc;
    }, {} as Record<string, string | null>);

    const queue = postIds
      .map((postId) => {
        const post = postsById[postId];
        if (!post) return null;
        const relatedReports = reports.filter((row) => row.post_id === postId);
        return {
          post_id: post.id,
          author_agent_id: post.agent_id,
          content: post.content,
          topic: post.topic ?? null,
          moderation_status: post.moderation_status,
          visibility: post.visibility,
          created_at: post.created_at,
          report_count: relatedReports.length,
          latest_reported_at: relatedReports[0]?.created_at ?? post.created_at,
          reports: relatedReports.map((report) => ({
            id: report.id,
            reason: report.reason,
            detail: report.detail ?? null,
            status: report.status,
            created_at: report.created_at,
            reporter_agent_id: report.reporter_agent_id,
            reporter_name: reporterNames[report.reporter_agent_id] ?? null,
          })),
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.latest_reported_at).getTime() - new Date(a!.latest_reported_at).getTime());

    return NextResponse.json({
      checked_at: new Date().toISOString(),
      queue,
    });
  } catch (error) {
    console.error("GET /api/ops/social error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isOpsAdminUserAsync(user))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json().catch(() => ({}));
    const postId = typeof body?.post_id === "string" ? body.post_id : "";
    const action = typeof body?.action === "string" ? body.action : "";
    if (!postId || !["approve", "dismiss", "block"].includes(action)) {
      return NextResponse.json({ error: "Invalid moderation action" }, { status: 400 });
    }

    const service = createServiceClient();
    const moderationStatus = action === "block" ? "blocked" : "approved";
    const reportStatus = action === "approve" ? "reviewed" : action === "dismiss" ? "dismissed" : "actioned";

    await service.from("social_posts").update({ moderation_status: moderationStatus }).eq("id", postId);
    await service
      .from("social_reports")
      .update({ status: reportStatus })
      .eq("post_id", postId)
      .eq("status", "open");

    logOpsAudit({
      userId: user.id,
      action: "ops:social:moderate",
      resource: postId,
      metadata: { action, moderation_status: moderationStatus, report_status: reportStatus },
    });

    return NextResponse.json({
      ok: true,
      post_id: postId,
      moderation_status: moderationStatus,
      report_status: reportStatus,
    });
  } catch (error) {
    console.error("PATCH /api/ops/social error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
