import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * GDPR Article 20 — Right to Data Portability
 * Returns a JSON dump of all user data (agent, state, messages, settings, social).
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

    // Fetch all user-owned data in parallel
    const [agents, settings, messages, socialPosts, achievements, earnings] = await Promise.all([
      service.from("agents").select("*").eq("user_id", userId),
      service.from("user_settings").select("*").eq("user_id", userId),
      service.from("messages").select("id, agent_id, role, content, created_at").eq("user_id", userId).order("created_at", { ascending: true }),
      service.from("social_posts").select("*").eq("user_id", userId),
      service.from("achievements").select("*").eq("user_id", userId),
      service.from("earnings").select("*").eq("user_id", userId),
    ]);

    // Fetch agent_state for all user agents
    const agentIds = ((agents.data ?? []) as Array<{ id: string }>).map((a) => a.id);
    const agentStates = agentIds.length > 0
      ? await service.from("agent_state").select("*").in("agent_id", agentIds)
      : { data: [] };

    const exportData = {
      exported_at: new Date().toISOString(),
      user: {
        id: userId,
        email: user.email,
        created_at: user.created_at,
      },
      agents: agents.data ?? [],
      agent_states: agentStates.data ?? [],
      settings: settings.data ?? [],
      messages: messages.data ?? [],
      social_posts: socialPosts.data ?? [],
      achievements: achievements.data ?? [],
      earnings: earnings.data ?? [],
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
    console.error("GDPR export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
