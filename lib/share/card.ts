import type { createServiceClient } from "@/lib/supabase/service";
import type { Locale } from "@/lib/i18n/config";

type DbClient = Pick<ReturnType<typeof createServiceClient>, "from">;

const MILESTONE_LABELS: Record<Locale, Record<string, string>> = {
  ko: {
    first_chat: "첫 대화",
    evolution: "진화",
    dream: "첫 꿈",
    artifact_creation: "첫 생성",
    social_encounter: "첫 소셜",
    self_naming: "자기 이름",
    personality_evolution: "성격 진화",
    perspective_journal: "관점 일지",
  },
  en: {
    first_chat: "First conversation",
    evolution: "Evolution",
    dream: "First dream",
    artifact_creation: "First creation",
    social_encounter: "First social moment",
    self_naming: "Self naming",
    personality_evolution: "Personality evolution",
    perspective_journal: "Perspective journal",
  },
};

const DEFAULT_SELF_NAME: Record<Locale, string> = {
  ko: "결",
  en: "Gyeol",
};

export type ShareCardData = {
  self_name: string;
  visual: { color?: string; shape?: string } | null;
  config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null } | null;
  total_messages: number;
  vitality: number;
  gen_level: number;
  milestones: Array<{ type: string; label: string; at: string; summary?: string }>;
  week_messages: number;
};

export async function loadShareCardData(
  db: DbClient,
  slug: string,
  locale: Locale
): Promise<ShareCardData | null> {
  const { data: shareRow } = await db
    .from("share_cards")
    .select("agent_id")
    .eq("slug", slug)
    .single();

  if (!shareRow) return null;

  const agentId = (shareRow as { agent_id: string }).agent_id;

  const [{ data: state }, { data: firstChat }, { data: logs }] = await Promise.all([
    db.from("agent_state").select("self_name, visual, total_messages, vitality, gen_level, config").eq("agent_id", agentId).single(),
    db.from("chats").select("created_at").eq("agent_id", agentId).order("created_at", { ascending: true }).limit(1).single(),
    db.from("autonomous_logs").select("action_type, summary, created_at").eq("agent_id", agentId).order("created_at", { ascending: true }),
  ]);

  const localizedLabels = MILESTONE_LABELS[locale];
  const milestones: { type: string; label: string; at: string; summary?: string }[] = [];

  if ((firstChat as { created_at?: string } | null)?.created_at) {
    milestones.push({
      type: "first_chat",
      label: localizedLabels.first_chat,
      at: (firstChat as { created_at: string }).created_at,
    });
  }

  const milestoneTypes = Object.keys(localizedLabels);
  const seen = new Set<string>();
  for (const log of logs ?? []) {
    const row = log as { action_type?: string; summary?: string; created_at: string };
    const actionType = row.action_type ?? "";
    if (!milestoneTypes.includes(actionType) || seen.has(actionType)) continue;
    seen.add(actionType);
    milestones.push({
      type: actionType,
      label: localizedLabels[actionType] ?? actionType,
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
    config?: { usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null };
  } | null;

  const weekStart = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
  const { data: weekChats } = await db
    .from("chats")
    .select("created_at, role")
    .eq("agent_id", agentId)
    .gte("created_at", weekStart);
  const weekMessages = (weekChats ?? []).filter((row: { role?: string }) => row.role === "user").length;

  return {
    self_name: stateData?.self_name ?? DEFAULT_SELF_NAME[locale],
    visual: stateData?.visual ?? null,
    total_messages: stateData?.total_messages ?? 0,
    vitality: stateData?.vitality ?? 1,
    gen_level: stateData?.gen_level ?? 1,
    config: {
      usage_profile: stateData?.config?.usage_profile ?? null,
    },
    milestones,
    week_messages: weekMessages,
  };
}

export function buildShareCardMetadata(data: ShareCardData | null, locale: Locale) {
  if (locale === "ko") {
    const title = data?.self_name ? `${data.self_name}의 성장 카드` : "결의 공유 카드";
    const description = data?.week_messages != null
      ? `이번 주 ${data.week_messages}개의 대화가 쌓인 결의 성장 카드입니다.`
      : "결의 성장 카드와 마일스톤을 확인해보세요.";
    return { title, description };
  }

  const title = data?.self_name ? `${data.self_name}'s growth card` : "Gyeol growth card";
  const description = data?.week_messages != null
    ? `A growth card capturing ${data.week_messages} conversations from this week.`
    : "Explore Gyeol's growth card and milestones.";
  return { title, description };
}
