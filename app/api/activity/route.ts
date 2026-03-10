import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { ensurePrimaryAgent } from "@/lib/agents/primary";

const TYPE_FILTER: Record<string, string[]> = {
  dream: ["dream_journal", "dream"],
  creation: ["poem", "diary", "unsent_letter", "artifact_creation", "perspective_journal", "birthday_review", "will", "collaboration", "fairytale"],
  image: ["image", "emotion_image"],
  music: ["music"],
  comic: ["comic"],
  video: ["video"],
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const typeParam = request.nextUrl.searchParams.get("type") ?? "all";
    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ items: [] });

    const [logsRes, artifactsRes] = await Promise.all([
      service.from("autonomous_logs").select("id, action_type, summary, created_at").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(80),
      service.from("artifacts").select("id, type, content, created_at, expires_at, is_preserved, is_public").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(80),
    ]);

    const logs = (logsRes.data ?? []).map((r) => ({
      id: (r as { id: string }).id,
      kind: "log" as const,
      action_type: (r as { action_type?: string }).action_type,
      summary: (r as { summary?: string }).summary,
      created_at: (r as { created_at?: string }).created_at,
    }));
    const artifacts = (artifactsRes.data ?? []).map((r) => ({
      id: (r as { id: string }).id,
      kind: "artifact" as const,
      type: (r as { type?: string }).type,
      content: (r as { content?: string }).content,
      created_at: (r as { created_at?: string }).created_at,
      expires_at: (r as { expires_at?: string }).expires_at,
      is_preserved: (r as { is_preserved?: boolean }).is_preserved,
      is_public: (r as { is_public?: boolean }).is_public,
    }));

    let combined = [...logs.map((l) => ({ ...l, created_at: l.created_at ?? "" })), ...artifacts.map((a) => ({ ...a, created_at: a.created_at ?? "" }))]
      .sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

    const artifactTypes = TYPE_FILTER[typeParam];
    if (typeParam !== "all" && artifactTypes) {
      combined = combined.filter((item) => {
        if (item.kind === "log") return artifactTypes.includes((item as { action_type?: string }).action_type ?? "");
        return item.type && artifactTypes.includes(item.type);
      });
    }
    combined = combined.slice(0, 50);

    return NextResponse.json({ items: combined });
  } catch (e) {
    console.error("GET /api/activity error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
