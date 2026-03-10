import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const MILESTONE_LABELS: Record<string, string> = {
  first_chat: "첫 대화",
  evolution: "진화",
  dream: "첫 꿈",
  artifact_creation: "첫 생성",
  social_encounter: "첫 소셜",
  self_naming: "자기 이름",
  personality_evolution: "성격 진화",
  perspective_journal: "관점 일지",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const service = createServiceClient();
    const { data: shareRow } = await service
      .from("share_cards")
      .select("agent_id")
      .eq("slug", slug)
      .single();

    if (!shareRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const agentId = (shareRow as { agent_id: string }).agent_id;

    const [
      { data: state },
      { data: firstChat },
      { data: logs },
    ] = await Promise.all([
      service.from("agent_state").select("self_name, visual, total_messages, vitality, gen_level").eq("agent_id", agentId).single(),
      service.from("chats").select("created_at").eq("agent_id", agentId).order("created_at", { ascending: true }).limit(1).single(),
      service.from("autonomous_logs").select("action_type, summary, created_at").eq("agent_id", agentId).order("created_at", { ascending: true }),
    ]);

    const milestones: { type: string; label: string; at: string; summary?: string }[] = [];
    if ((firstChat as { created_at?: string } | null)?.created_at) {
      milestones.push({
        type: "first_chat",
        label: MILESTONE_LABELS.first_chat,
        at: (firstChat as { created_at: string }).created_at,
      });
    }

    const milestoneTypes = Object.keys(MILESTONE_LABELS);
    const seen = new Set<string>();
    for (const log of logs ?? []) {
      const row = log as { action_type?: string; summary?: string; created_at: string };
      const atype = row.action_type ?? "";
      if (!milestoneTypes.includes(atype) || seen.has(atype)) continue;
      seen.add(atype);
      milestones.push({
        type: atype,
        label: MILESTONE_LABELS[atype] ?? atype,
        at: row.created_at,
        summary: row.summary?.slice(0, 120),
      });
    }

    milestones.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    const stateData = state as {
      self_name?: string;
      visual?: { color?: string; shape?: string };
      total_messages?: number;
      vitality?: number;
      gen_level?: number;
    } | null;

    const weekStart = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
    const { data: weekChats } = await service
      .from("chats")
      .select("created_at, role")
      .eq("agent_id", agentId)
      .gte("created_at", weekStart);
    const weekMessages = (weekChats ?? []).filter((c: { role?: string }) => c.role === "user").length;

    return NextResponse.json({
      self_name: stateData?.self_name ?? "결의",
      visual: stateData?.visual ?? null,
      total_messages: stateData?.total_messages ?? 0,
      vitality: stateData?.vitality ?? 1,
      gen_level: stateData?.gen_level ?? 1,
      milestones,
      week_messages: weekMessages,
    });
  } catch (e) {
    console.error("GET /api/share/[slug] error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
