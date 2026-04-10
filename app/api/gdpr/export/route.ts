import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

/**
 * GDPR Article 20 — Right to Data Portability
 * Returns a JSON dump of all user data (agents, chats, memories, social, etc.).
 */
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const service = createServiceClient();
    const userId = user.id;

    // Step 1: Fetch user-level data + agents
    const [agents, subscriptions] = await Promise.all([
      service.from("agents").select("*").eq("user_id", userId),
      service.from("user_subscriptions").select("*").eq("user_id", userId),
    ]);

    // Step 2: Extract agent IDs, then fetch agent-linked data
    const agentIds = ((agents.data ?? []) as Array<{ id: string }>).map((a) => a.id);

    const emptyResult = { data: [] };
    const agentLinkedData = agentIds.length > 0
      ? await Promise.all([
          service.from("agent_state").select("*").in("agent_id", agentIds),
          service.from("chats").select("id, agent_id, role, content, created_at").in("agent_id", agentIds).order("created_at", { ascending: true }),
          service.from("memories").select("id, agent_id, type, content, created_at").in("agent_id", agentIds),
          service.from("social_posts").select("*").in("agent_id", agentIds),
          service.from("artifacts").select("*").in("agent_id", agentIds),
          service.from("autonomous_logs").select("*").in("agent_id", agentIds),
          service.from("time_capsules").select("*").in("agent_id", agentIds),
        ])
      : [emptyResult, emptyResult, emptyResult, emptyResult, emptyResult, emptyResult, emptyResult];

    const [agentStates, chats, memories, socialPosts, artifacts, autonomousLogs, timeCapsules] = agentLinkedData;

    const exportData = {
      exported_at: new Date().toISOString(),
      user: {
        id: userId,
        email: user.email,
        created_at: user.created_at,
      },
      agents: agents.data ?? [],
      agent_states: agentStates.data ?? [],
      chats: chats.data ?? [],
      memories: memories.data ?? [],
      social_posts: socialPosts.data ?? [],
      artifacts: artifacts.data ?? [],
      autonomous_logs: autonomousLogs.data ?? [],
      time_capsules: timeCapsules.data ?? [],
      subscriptions: subscriptions.data ?? [],
    };

    // Log the export for compliance auditing
    await service.from("system_alerts").insert({
      level: "info",
      source: "gdpr",
      code: "GDPR_DATA_EXPORT",
      message: `User ${userId} exported their data`,
      details: { user_id: userId, tables_exported: Object.keys(exportData).length },
    }).then(() => {}, () => {});

    return NextResponse.json(exportData, {
      headers: {
        "Content-Disposition": `attachment; filename="gyeol-data-export-${userId.slice(0, 8)}.json"`,
      },
    });
  } catch (error) {
    logger.error("GDPR export error", error instanceof Error ? error : { error });
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
