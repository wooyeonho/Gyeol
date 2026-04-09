import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { getDemoAgentState } from "@/lib/demo/runtime";
import { isMissingEnvError } from "@/lib/env/required";
import { resolveLocale } from "@/lib/i18n/config";
import { renderLogSummary } from "@/lib/activity/log-templates";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/activity" });

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
    const locale = resolveLocale({
      acceptLanguage: request.headers.get("accept-language"),
      cookieHeader: request.headers.get("cookie"),
    });
    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ items: [] });

    const [logsRes, artifactsRes, stateRes] = await Promise.all([
      service.from("autonomous_logs").select("id, action_type, summary, created_at").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(80),
      service.from("artifacts").select("id, type, content, created_at, expires_at, is_preserved, is_public").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(80),
      service.from("agent_state").select("self_name, visual, genome, config, self_model, gen_level, vitality, mood").eq("agent_id", agentId).single(),
    ]);

    const logs = (logsRes.data ?? []).map((r) => {
      const rec = r as { id: string; action_type?: string; summary?: string; created_at?: string };
      return {
        id: rec.id,
        kind: "log" as const,
        action_type: rec.action_type,
        summary: renderLogSummary(rec.action_type, rec.summary, locale),
        created_at: rec.created_at,
      };
    });
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

    const state = stateRes.data as {
      self_name?: string | null;
      visual?: unknown;
      genome?: unknown;
      config?: { usage_profile?: unknown } | null;
      self_model?: unknown;
      gen_level?: number | null;
      vitality?: number | null;
      mood?: string | null;
    } | null;

    return NextResponse.json({
      items: combined,
      selfAgent: state
        ? {
            self_name: state.self_name ?? null,
            visual: state.visual ?? null,
            genome: state.genome ?? null,
            config: { usage_profile: state.config?.usage_profile ?? null },
            self_model: state.self_model ?? null,
            gen_level: state.gen_level ?? 1,
            vitality: state.vitality ?? 1,
            mood: state.mood ?? null,
          }
        : null,
    });
  } catch (e) {
    log.error("GET /api/activity error", e instanceof Error ? e : { detail: String(e) });
    if (isMissingEnvError(e)) {
      const demo = getDemoAgentState();
      return NextResponse.json({
        items: [
          {
            id: "demo-log-1",
            kind: "log",
            action_type: "heartbeat",
            summary: "Stayed awake and kept a quiet emotional pulse.",
            created_at: new Date().toISOString(),
          },
          {
            id: "demo-artifact-1",
            kind: "artifact",
            type: "dream_journal",
            title: "First dream fragment",
            content: "A soft aurora hovered above the room.",
            is_preserved: true,
            created_at: new Date().toISOString(),
          },
        ],
        selfAgent: {
          self_name: demo.self_name,
          visual: demo.visual,
          genome: demo.genome,
          config: { usage_profile: (demo.config as { usage_profile?: unknown })?.usage_profile ?? null },
          self_model: demo.self_model,
          gen_level: demo.gen_level,
          vitality: demo.vitality,
          mood: demo.mood,
        },
        demo_mode: true,
      });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
