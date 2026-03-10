import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";

type SummaryItem = {
  id: string;
  kind: "activity" | "milestone";
  title: string;
  created_at: string;
};

const MILESTONE_TYPES = [
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) {
      return NextResponse.json({ recent_items: [], summary: null });
    }

    const [{ data: stateRow }, { data: recentLogs }, { data: recentArtifacts }, { data: firstChat }, { data: milestoneLogs }] =
      await Promise.all([
        service.from("agent_state").select("total_messages, gen_level, mood, vitality").eq("agent_id", agentId).single(),
        service
          .from("autonomous_logs")
          .select("id, action_type, summary, created_at")
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false })
          .limit(6),
        service
          .from("artifacts")
          .select("id, type, title, content, created_at")
          .eq("agent_id", agentId)
          .order("created_at", { ascending: false })
          .limit(3),
        service
          .from("chats")
          .select("created_at")
          .eq("agent_id", agentId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        service
          .from("autonomous_logs")
          .select("id, action_type, summary, created_at")
          .eq("agent_id", agentId)
          .in("action_type", [...MILESTONE_TYPES])
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

    const activityItems: SummaryItem[] = [
      ...((recentLogs ?? []) as Array<{ id: string; summary?: string; created_at?: string }>).map((item) => ({
        id: item.id,
        kind: "activity" as const,
        title: item.summary ?? "새로운 활동이 기록되었습니다.",
        created_at: item.created_at ?? new Date().toISOString(),
      })),
      ...((recentArtifacts ?? []) as Array<{ id: string; title?: string; content?: string; created_at?: string }>).map((item) => ({
        id: item.id,
        kind: "activity" as const,
        title: item.title ?? item.content?.slice(0, 80) ?? "새로운 아티팩트가 생성되었습니다.",
        created_at: item.created_at ?? new Date().toISOString(),
      })),
    ];

    const milestoneItems: SummaryItem[] = [];
    if ((firstChat as { created_at?: string } | null)?.created_at) {
      milestoneItems.push({
        id: "first-chat",
        kind: "milestone",
        title: "첫 대화가 앨범에 기록되어 있습니다.",
        created_at: (firstChat as { created_at: string }).created_at,
      });
    }
    milestoneItems.push(
      ...((milestoneLogs ?? []) as Array<{ id: string; summary?: string; created_at?: string }>).map((item) => ({
        id: item.id,
        kind: "milestone" as const,
        title: item.summary ?? "새로운 마일스톤이 기록되었습니다.",
        created_at: item.created_at ?? new Date().toISOString(),
      }))
    );

    const recentItems = [...activityItems, ...milestoneItems]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);

    const state = (stateRow ?? null) as {
      total_messages?: number;
      gen_level?: number;
      mood?: string;
      vitality?: number;
    } | null;

    return NextResponse.json({
      recent_items: recentItems,
      summary: {
        gen_level: state?.gen_level ?? 1,
        mood: state?.mood ?? null,
        total_messages: state?.total_messages ?? 0,
        vitality: state?.vitality ?? 1,
      },
    });
  } catch (error) {
    console.error("GET /api/home/summary error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
