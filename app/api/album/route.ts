import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { ensurePrimaryAgent } from "@/lib/agents/primary";

const MILESTONE_TYPES = [
  "first_chat",
  "evolution",
  "dream",
  "artifact_creation",
  "social_encounter",
  "self_naming",
  "personality_evolution",
  "perspective_journal",
] as const;

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { agentId, createdAt } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ milestones: [] });

    const created = createdAt;
    const milestones: { type: string; label: string; at: string; summary?: string }[] = [];

    const { data: firstChat } = await service
      .from("chats")
      .select("created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();
    if (firstChat?.created_at) {
      milestones.push({
        type: "first_chat",
        label: "First conversation",
        at: (firstChat as { created_at: string }).created_at,
      });
    }

    const { data: logs } = await service
      .from("autonomous_logs")
      .select("action_type, summary, created_at")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: true });
    const seen = new Set<string>();
    for (const log of logs ?? []) {
      const row = log as { action_type?: string; summary?: string; created_at: string };
      const atype = row.action_type ?? "";
      if (!MILESTONE_TYPES.includes(atype as (typeof MILESTONE_TYPES)[number]) || seen.has(atype)) continue;
      seen.add(atype);
      const label =
        atype === "evolution"
          ? "Evolution"
          : atype === "dream"
            ? "First dream"
            : atype === "artifact_creation"
              ? "First creation"
              : atype === "social_encounter"
                ? "First social"
                : atype === "self_naming"
                  ? "Self naming"
                  : atype === "personality_evolution"
                    ? "Personality evolution"
                    : atype === "perspective_journal"
                      ? "Perspective journal"
                      : atype;
      milestones.push({
        type: atype,
        label,
        at: row.created_at,
        summary: row.summary?.slice(0, 120),
      });
    }

    milestones.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    const { data: state } = await service.from("agent_state").select("visual, config").eq("agent_id", agentId).single();
    const visual = (state as { visual?: { color?: string; shape?: string } } | null)?.visual;
    const config = (state as { config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } } | null)?.config;

    return NextResponse.json({
      milestones,
      visual,
      config: { usage_profile: config?.usage_profile ?? null },
      created,
    });
  } catch (e) {
    console.error("album GET error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
