import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { getResolvedBillingState } from "@/lib/billing/service";

type SummaryItem = {
  id: string;
  kind: "activity" | "milestone";
  title: string;
  created_at: string;
};

type TimelineRow = { created_at?: string | null };

const MILESTONE_TYPES = [
  "evolution",
  "dream",
  "artifact_creation",
  "social_encounter",
  "self_naming",
  "personality_evolution",
  "perspective_journal",
] as const;

function dayKey(value: string) {
  return value.slice(0, 10);
}

function countStreakDays(activityDates: string[]) {
  if (activityDates.length === 0) return { streakDays: 0, todayActive: false };
  const uniqueDays = [...new Set(activityDates.map(dayKey))].sort((a, b) => (a > b ? -1 : 1));
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const latest = uniqueDays[0];
  const latestDate = new Date(`${latest}T00:00:00.000Z`);
  const todayDate = new Date(`${todayKey}T00:00:00.000Z`);

  const diffDays = Math.floor((todayDate.getTime() - latestDate.getTime()) / 86400000);
  if (diffDays > 1) {
    return { streakDays: 0, todayActive: false };
  }

  let streakDays = 0;
  let cursor = latestDate;
  const uniqueSet = new Set(uniqueDays);
  while (uniqueSet.has(cursor.toISOString().slice(0, 10))) {
    streakDays += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }

  return {
    streakDays,
    todayActive: uniqueSet.has(todayKey),
  };
}

function buildWeeklyHighlight(params: {
  artifactCount: number;
  milestoneCount: number;
  userMessageCount: number;
}) {
  if (params.milestoneCount > 0) {
    return "이번 주에는 마일스톤이 생겼습니다. 앨범에서 꼭 다시 확인해보세요.";
  }
  if (params.artifactCount > 0) {
    return "이번 주에는 새로운 생성물이 남았습니다. 활동에서 결과물을 돌아보세요.";
  }
  if (params.userMessageCount >= 7) {
    return "이번 주 대화가 충분히 쌓였습니다. 결의 반응 패턴이 더 선명해지고 있습니다.";
  }
  if (params.userMessageCount > 0) {
    return "이번 주 대화의 흐름이 이어지고 있습니다. 한 번 더 체크인하면 streak가 단단해집니다.";
  }
  return "이번 주 첫 대화를 시작하면 활동과 앨범, 리텐션 루프가 다시 열립니다.";
}

function buildNextAction(params: {
  isFirstSession: boolean;
  streakDays: number;
  todayActive: boolean;
  weeklyMessageCount: number;
}) {
  if (params.isFirstSession) return "첫 메시지 한 번이면 기억, 활동, 앨범이 동시에 열립니다.";
  if (!params.todayActive) return "오늘의 짧은 체크인 한 번으로 streak를 이어가세요.";
  if (params.weeklyMessageCount < 3) return "이번 주 한 번 더 대화하면 결의 변화가 더 분명해집니다.";
  if (params.streakDays >= 3) return "지금은 앨범과 활동에서 이번 주 흐름을 다시 보는 것이 좋습니다.";
  return "최근 변화 카드 중 하나를 열어 오늘의 흐름을 이어가세요.";
}

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
    const billing = await getResolvedBillingState(service, user.id);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStartIso = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
    const monthStartIso = new Date(Date.now() - 30 * 24 * 3600000).toISOString();

    const [
      { data: stateRow },
      { data: recentLogs },
      { data: recentArtifacts },
      { data: firstChat },
      { data: milestoneLogs },
      { data: recentChatsForRecap },
      { data: recentLogsForRecap },
      { data: recentArtifactsForRecap },
    ] =
      await Promise.all([
        service.from("agent_state").select("total_messages, gen_level, mood, vitality, config").eq("agent_id", agentId).single(),
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
        service
          .from("chats")
          .select("created_at, role")
          .eq("agent_id", agentId)
          .gte("created_at", monthStartIso)
          .order("created_at", { ascending: false })
          .limit(200),
        service
          .from("autonomous_logs")
          .select("created_at, action_type")
          .eq("agent_id", agentId)
          .gte("created_at", monthStartIso)
          .order("created_at", { ascending: false })
          .limit(200),
        service
          .from("artifacts")
          .select("created_at, type")
          .eq("agent_id", agentId)
          .gte("created_at", monthStartIso)
          .order("created_at", { ascending: false })
          .limit(100),
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
      .slice(0, billing.entitlements.long_term_history ? 6 : 3);

    const recentChats = (recentChatsForRecap ?? []) as Array<TimelineRow & { role?: string }>;
    const recentLogRows = (recentLogsForRecap ?? []) as Array<TimelineRow & { action_type?: string }>;
    const recentArtifactRows = (recentArtifactsForRecap ?? []) as Array<TimelineRow & { type?: string }>;
    const allActivityDates = [
      ...recentChats.map((item) => item.created_at).filter(Boolean),
      ...recentLogRows.map((item) => item.created_at).filter(Boolean),
      ...recentArtifactRows.map((item) => item.created_at).filter(Boolean),
    ] as string[];
    const { streakDays, todayActive } = countStreakDays(allActivityDates);

    const todayStartIso = todayStart.toISOString();
    const todayUserMessages = recentChats.filter(
      (item) => item.role === "user" && item.created_at && item.created_at >= todayStartIso
    ).length;
    const todayActivities = recentLogRows.filter((item) => item.created_at && item.created_at >= todayStartIso).length;
    const weekUserMessages = recentChats.filter(
      (item) => item.role === "user" && item.created_at && item.created_at >= weekStartIso
    ).length;
    const weekArtifacts = recentArtifactRows.filter((item) => item.created_at && item.created_at >= weekStartIso).length;
    const weekMilestones = recentLogRows.filter(
      (item) =>
        item.created_at &&
        item.created_at >= weekStartIso &&
        item.action_type &&
        MILESTONE_TYPES.includes(item.action_type as (typeof MILESTONE_TYPES)[number])
    ).length;

    const state = (stateRow ?? null) as {
      config?: Record<string, unknown>;
      total_messages?: number;
      gen_level?: number;
      mood?: string;
      vitality?: number;
    } | null;
    const config = state?.config ?? {};

    return NextResponse.json({
      recent_items: recentItems,
      recap: {
        goal_loop: {
          active_goal: typeof config.active_goal === "string" ? config.active_goal : null,
          research_focus: typeof config.research_focus === "string" ? config.research_focus : null,
          updated_at: typeof config.goal_updated_at === "string" ? config.goal_updated_at : null,
        },
        next_action: billing.entitlements.advanced_recaps
          ? buildNextAction({
              isFirstSession: (state?.total_messages ?? 0) === 0,
              streakDays,
              todayActive,
              weeklyMessageCount: weekUserMessages,
            })
          : "고급 리캡은 Pro 이상에서 열립니다. 지금은 오늘의 체크인과 최근 활동에 집중해보세요.",
        premium_locked: !billing.entitlements.advanced_recaps,
        streak: {
          days: streakDays,
          today_active: todayActive,
        },
        today: {
          activities: todayActivities,
          user_messages: todayUserMessages,
        },
        weekly: {
          artifacts: weekArtifacts,
          highlight: billing.entitlements.advanced_recaps
            ? buildWeeklyHighlight({
                artifactCount: weekArtifacts,
                milestoneCount: weekMilestones,
                userMessageCount: weekUserMessages,
              })
            : "주간 하이라이트와 더 긴 회고는 Pro 이상 플랜에서 확인할 수 있습니다.",
          milestones: weekMilestones,
          user_messages: weekUserMessages,
        },
      },
      summary: {
        entitlements: billing.entitlements,
        gen_level: state?.gen_level ?? 1,
        mood: state?.mood ?? null,
        plan_tier: billing.plan.tier,
        total_messages: state?.total_messages ?? 0,
        vitality: state?.vitality ?? 1,
      },
    });
  } catch (error) {
    console.error("GET /api/home/summary error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
