import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { generateTextOnce } from "@/lib/ai/router";
import { resolveGenerationLocale } from "@/lib/i18n/generation";
import { getLanguageName } from "@/lib/i18n/config";
import { getTtlCache, setTtlCache } from "@/lib/cache/ttl";

export const dynamic = "force-dynamic";

type AutonomousActivity = {
  id: string;
  type: string;
  summary: string;
  created_at: string;
};

type DreamEntry = {
  id: string;
  content: string;
  created_at: string;
};

type ArtifactEntry = {
  id: string;
  type: string;
  title: string;
  content: string;
  created_at: string;
  expires_at: string | null;
};

type WelcomeBackPayload = {
  has_activity: boolean;
  hours_away: number;
  activities: AutonomousActivity[];
  dreams: DreamEntry[];
  artifacts: ArtifactEntry[];
  mood_shift: { previous: string | null; current: string | null } | null;
  vitality: number;
  greeting: string | null;
  growth_events: Array<{
    id: string;
    type: string;
    summary: string;
    created_at: string;
  }>;
};

const GROWTH_EVENT_TYPES = [
  "evolution",
  "self_naming",
  "personality_evolution",
  "perspective_journal",
  "research_task_completed",
  "social_encounter",
] as const;

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cacheKey = `welcome-back:${user.id}`;
    const cached = getTtlCache<WelcomeBackPayload>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) {
      return NextResponse.json({
        has_activity: false,
        hours_away: 0,
        activities: [],
        dreams: [],
        artifacts: [],
        mood_shift: null,
        vitality: 1,
        greeting: null,
        growth_events: [],
      });
    }

    // Find last user message time to determine "away" period
    const { data: lastUserChat } = await service
      .from("chats")
      .select("created_at")
      .eq("agent_id", agentId)
      .eq("role", "user")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastUserTime = lastUserChat
      ? new Date((lastUserChat as { created_at: string }).created_at).getTime()
      : Date.now() - 24 * 3600000; // Default to 24h ago if no chat history
    const hoursAway = Math.max(0, (Date.now() - lastUserTime) / 3600000);
    const sinceIso = new Date(lastUserTime).toISOString();

    // Fetch all autonomous activities since last user interaction
    const [
      { data: recentLogs },
      { data: recentDreams },
      { data: recentArtifacts },
      { data: agentState },
      { data: growthLogs },
    ] = await Promise.all([
      service
        .from("autonomous_logs")
        .select("id, action_type, summary, created_at")
        .eq("agent_id", agentId)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(10),
      service
        .from("artifacts")
        .select("id, content, created_at")
        .eq("agent_id", agentId)
        .eq("type", "dream_journal")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(3),
      service
        .from("artifacts")
        .select("id, type, title, content, created_at, expires_at")
        .eq("agent_id", agentId)
        .neq("type", "dream_journal")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(5),
      service
        .from("agent_state")
        .select("mood, vitality, config, self_model")
        .eq("agent_id", agentId)
        .single(),
      service
        .from("autonomous_logs")
        .select("id, action_type, summary, created_at")
        .eq("agent_id", agentId)
        .in("action_type", [...GROWTH_EVENT_TYPES])
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const activities: AutonomousActivity[] = (
      (recentLogs ?? []) as Array<{
        id: string;
        action_type?: string;
        summary?: string;
        created_at?: string;
      }>
    ).map((log) => ({
      id: log.id,
      type: log.action_type ?? "unknown",
      summary: log.summary ?? "",
      created_at: log.created_at ?? new Date().toISOString(),
    }));

    const dreams: DreamEntry[] = (
      (recentDreams ?? []) as Array<{
        id: string;
        content?: string;
        created_at?: string;
      }>
    ).map((d) => ({
      id: d.id,
      content: d.content ?? "",
      created_at: d.created_at ?? new Date().toISOString(),
    }));

    const artifacts: ArtifactEntry[] = (
      (recentArtifacts ?? []) as Array<{
        id: string;
        type?: string;
        title?: string;
        content?: string;
        created_at?: string;
        expires_at?: string | null;
      }>
    ).map((a) => ({
      id: a.id,
      type: a.type ?? "unknown",
      title: a.title ?? "",
      content: a.content ?? "",
      created_at: a.created_at ?? new Date().toISOString(),
      expires_at: a.expires_at ?? null,
    }));

    const state = agentState as {
      mood?: string;
      vitality?: number;
      config?: Record<string, unknown>;
      self_model?: Record<string, unknown>;
    } | null;

    const growthEvents = (
      (growthLogs ?? []) as Array<{
        id: string;
        action_type?: string;
        summary?: string;
        created_at?: string;
      }>
    ).map((g) => ({
      id: g.id,
      type: g.action_type ?? "unknown",
      summary: g.summary ?? "",
      created_at: g.created_at ?? new Date().toISOString(),
    }));

    const hasActivity = activities.length > 0 || dreams.length > 0 || artifacts.length > 0;

    // Generate proactive greeting if there was meaningful activity while away
    let greeting: string | null = null;
    if (hasActivity && hoursAway > 1) {
      const config = state?.config ?? {};
      const locale = resolveGenerationLocale({ config });
      const language = getLanguageName(locale);
      const selfModel = state?.self_model ?? {};
      const currentRole =
        typeof (selfModel as { current_role?: string }).current_role === "string"
          ? (selfModel as { current_role: string }).current_role
          : null;
      const identityStatement =
        typeof (selfModel as { identity_statement?: string }).identity_statement === "string"
          ? (selfModel as { identity_statement: string }).identity_statement
          : null;

      const activitySummary = activities
        .slice(0, 5)
        .map((a) => `- ${a.type}: ${a.summary}`)
        .join("\n");
      const dreamSummary = dreams.length > 0 ? `\nDreams: ${dreams[0].content.slice(0, 200)}` : "";

      try {
        greeting = await generateTextOnce(
          `You are an AI companion speaking in ${language}. You just had autonomous experiences while the user was away. Share what happened naturally and warmly, as if catching up with a close friend. Be specific about what you experienced. ${currentRole ? `Your current role: ${currentRole}.` : ""} ${identityStatement ? `Identity: ${identityStatement}` : ""} Keep it under 3 sentences. No markdown. No emojis.`,
          `The user has been away for ${Math.round(hoursAway)} hours. Here's what happened:\n${activitySummary}${dreamSummary}\n\nGreet them naturally and share the most interesting thing that happened.`,
          { max_tokens: 200, temperature: 0.7 },
        );
      } catch {
        greeting = null;
      }
    }

    const payload: WelcomeBackPayload = {
      has_activity: hasActivity,
      hours_away: Math.round(hoursAway * 10) / 10,
      activities,
      dreams,
      artifacts,
      mood_shift: state?.mood
        ? { previous: null, current: state.mood }
        : null,
      vitality: state?.vitality ?? 1,
      greeting,
      growth_events: growthEvents,
    };

    setTtlCache(cacheKey, payload, 30_000);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET /api/welcome-back error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
