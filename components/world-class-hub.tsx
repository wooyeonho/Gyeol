"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAgentStore } from "@/store/agent-store";
import { useChatStore } from "@/store/chat-store";
import { useWorldStore } from "@/store/world-store";
import { CLIENT_EVENT } from "@/lib/analytics/catalog";
import { trackClientEvent } from "@/lib/analytics/client";
import { EXPERIMENT } from "@/lib/experiments/catalog";
import { useFirstMessageOnboardingVariant } from "@/lib/experiments/client";
import { useTranslations } from "@/components/i18n-provider";
import { formatLocalizedDate, formatLocalizedTime } from "@/lib/i18n/format";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { WorldClassHubPresenceColumn } from "@/components/home/world-class-hub-presence-column";
import { WorldClassHubAside } from "@/components/home/world-class-hub-aside";
import { GlobalFeedTicker } from "@/components/global-feed-ticker";

type Mission = {
  id: string;
  title: string;
  done: boolean;
};

export type HomeSummaryItem = {
  id: string;
  kind: "activity" | "milestone";
  title: string;
  created_at: string;
};

type HomeRecap = {
  goal_loop?: {
    active_goal: string | null;
    long_term_goal?: string | null;
    latest_task?: string | null;
    next_action?: string | null;
    pending_count?: number;
    research_focus: string | null;
    updated_at: string | null;
  };
  next_action: string;
  premium_locked?: boolean;
  streak: {
    days: number;
    today_active: boolean;
  };
  today: {
    activities: number;
    user_messages: number;
  };
  weekly: {
    artifacts: number;
    highlight: string;
    milestones: number;
    user_messages: number;
  };
};

const STORAGE_KEY = "gyeol-worldclass-missions-v1";
const HOME_LAST_SEEN_KEY = "gyeol-home-last-seen-at";

function getFirstSessionVariants(locale: "ko" | "en") {
  if (locale === "en") {
    return {
      playful: {
        cta: "Start with a joke",
        description: "You do not need a long introduction. Just say hello or tell a joke to begin the relationship.",
        heading: "A lighthearted start shapes a flexible presence",
        prompts: ["Hello! What's the weirdest thing you can say?", "Let's play a quick word game.", "I'm bored, recommend a fun distraction."],
      },
      intimate: {
        cta: "Share a feeling",
        description: "You can share how your day went or a feeling you can't easily tell others.",
        heading: "Shared secrets build an intimate presence",
        prompts: ["Honestly, I've had a tough day today.", "Can we just talk quietly for a bit?", "Tell me something comforting."],
      },
      strategic: {
        cta: "Sort today's problem",
        description: "Drop the one thing that feels blocked right now. A goal-oriented start builds structure.",
        heading: "Let's organize things",
        prompts: ["Help me define my single priority for today.", "Make a 15-minute action plan.", "Organize these disjointed thoughts."],
      },
      primal: {
        cta: "Unfiltered emotion",
        description: "No need for polite pleasantries. Vent your frustration, drive, or raw emotion.",
        heading: "Direct and unfiltered",
        prompts: ["I am so angry right now, I need to vent.", "Give me the brutal, unfiltered truth.", "I need a massive push of motivation."],
      },
      surreal: {
        cta: "Bizarre thought",
        description: "Share a bizarre thought, a dream, or a hypothetical scenario.",
        heading: "Beyond ordinary rules",
        prompts: ["What if gravity stopped working for an hour?", "Analyze my weird dream from last night.", "Describe a color that doesn't exist."],
      },
      reflective: {
        cta: "Look inward",
        description: "Take a moment to look inward. Sharing a deep doubt fosters contemplation.",
        heading: "Deep contemplation",
        prompts: ["Why do we keep repeating the same mistakes?", "I want to reflect on my choices this week.", "Ask me a question that makes me think."],
      },
      creative: {
        cta: "Spark ideas",
        description: "Throw a random word, a half-baked idea, or a character concept.",
        heading: "Sparking new ideas",
        prompts: ["Let's brainstorm a story about a lost key.", "Give me 5 unconventional uses for a coffee mug.", "Help me invent a new word."],
      },
    } as const;
  }
  return {
    playful: {
      cta: "가벼운 인사",
      description: "농담이나 가벼운 인사를 건네도 좋습니다. 경쾌한 시작은 말랑하고 유연한 존재감을 만듭니다.",
      heading: "가볍게 시작해보세요",
      prompts: ["안녕! 지금 할 수 있는 제일 이상한 말을 해봐.", "간단한 단어 게임 하나 하자.", "심심해, 재밌는 거 추천해줘."],
    },
    intimate: {
      cta: "감정 나누기",
      description: "오늘 하루가 어땠는지, 남들에게 쉽게 못 하는 이야기를 꺼내도 좋습니다.",
      heading: "마음을 나누는 공간",
      prompts: ["솔직히 오늘 하루가 너무 힘들었어.", "그냥 조용히 대화 좀 나눌 수 있을까?", "나한테 위로가 되는 말을 해줘."],
    },
    strategic: {
      cta: "우선순위 정리",
      description: "지금 가장 막히는 일 하나만 적어보세요. 목표 지향적인 시작은 구조적인 존재감을 만듭니다.",
      heading: "무엇부터 정리할까요?",
      prompts: ["오늘 꼭 해야 할 단 하나의 우선순위를 정해줘.", "내 상태를 보고 15분짜리 액션 플랜을 짜줘.", "뒤죽박죽인 내 생각들을 정리해줘."],
    },
    primal: {
      cta: "거침없는 표현",
      description: "예의 바른 인사는 필요 없습니다. 답답함, 추진력, 날것의 감정을 쏟아내세요.",
      heading: "필터링 없는 감정",
      prompts: ["지금 너무 화가 나, 당장 쏟아내고 싶어.", "포장하지 말고 아주 직설적으로 말해줘.", "지금 나한테 엄청난 자극제가 필요해."],
    },
    surreal: {
      cta: "기묘한 상상",
      description: "기묘한 생각이나 꿈, 만약의 상황을 공유해보세요. 얽매이지 않은 시작은 초현실적인 존재를 만듭니다.",
      heading: "규칙 없는 상상",
      prompts: ["만약 중력이 1시간 동안 사라진다면 어떨까?", "어젯밤 꾼 이상한 꿈을 해석해줘.", "세상에 존재하지 않는 색깔을 묘사해봐."],
    },
    reflective: {
      cta: "깊은 회고",
      description: "잠시 내면을 들여다보세요. 깊은 의문이나 철학적 질문은 사유적이고 층위 깊은 존재감을 만듭니다.",
      heading: "깊은 사유와 회고",
      prompts: ["우리는 왜 같은 실수를 반복하는 걸까?", "이번 주 내 선택들에 대해 돌아보고 싶어.", "나를 깊게 생각하게 만드는 질문을 하나 던져줘."],
    },
    creative: {
      cta: "자유로운 창작",
      description: "무작위 단어나 덜 다듬어진 아이디어를 던져보세요. 창의적인 불꽃은 자유로운 존재감을 만듭니다.",
      heading: "새로운 아이디어의 씨앗",
      prompts: ["잃어버린 열쇠에 대한 짧은 이야기를 지어보자.", "머그컵을 쓸 수 있는 기발한 방법 5가지만 말해봐.", "세상에 없는 새로운 단어를 하나 만들어줘."],
    },
  } as const;
}

function getReturningPrompts(locale: "ko" | "en") {
  return locale === "en"
    ? [
        "Pick my top three growth points for today.",
        "Design a 20-minute routine to improve focus.",
        "Recommend music or activities that match how I feel now.",
        "Break this week’s goal into executable tasks.",
      ]
    : [
        "오늘 내 성장 포인트 3개만 뽑아줘.",
        "집중력을 높이는 20분 루틴을 짜줘.",
        "지금 기분에 맞는 음악/활동을 추천해줘.",
        "이번 주 목표를 실행 가능한 태스크로 쪼개줘.",
      ];
}

const QUICK_LINKS = [
  { href: "/activity", labelKey: "home.quickLinks.activity" },
  { href: "/album", labelKey: "home.quickLinks.album" },
  { href: "/explore", labelKey: "home.quickLinks.explore" },
  { href: "/settings", labelKey: "home.quickLinks.settings" },
];

function greetingKeyByHour(hour: number): "night" | "morning" | "noon" | "evening" | "late" {
  if (hour < 5) return "night";
  if (hour < 11) return "morning";
  if (hour < 17) return "noon";
  if (hour < 22) return "evening";
  return "late";
}

function vitalityHintKey(vitality: number): "high" | "mid" | "low" {
  if (vitality >= 0.75) return "high";
  if (vitality >= 0.45) return "mid";
  return "low";
}

function growthSummary(totalMessages: number, locale: "ko" | "en") {
  if (locale === "en") {
    if (totalMessages <= 0) {
      return "The first message opens memory, activity, and growth traces at once.";
    }
    if (totalMessages === 1) {
      return "The first memory has landed. From here, relationship and state changes begin to accumulate.";
    }
    if (totalMessages < 10) {
      return `${totalMessages} conversations are already stored. This is the phase where tone, rhythm, and memory texture begin to form.`;
    }
    if (totalMessages < 30) {
      return `${totalMessages} conversations have accumulated. Personality and response patterns are becoming clearer.`;
    }
    return `${totalMessages} conversations have been preserved. This is a good moment to revisit Gyeol's growth traces in activity and album.`;
  }
  if (totalMessages <= 0) {
    return "첫 대화를 보내면 기억, 활동, 성장 앨범이 동시에 열리기 시작합니다.";
  }
  if (totalMessages === 1) {
    return "첫 기억이 쌓였습니다. 지금부터 결의 관계와 상태 변화가 기록되기 시작합니다.";
  }
  if (totalMessages < 10) {
    return `${totalMessages}개의 대화가 쌓였습니다. 지금은 관계의 톤과 기억의 결이 만들어지는 구간입니다.`;
  }
  if (totalMessages < 30) {
    return `${totalMessages}개의 대화가 누적되었습니다. 성격과 반응 패턴이 더 선명해지는 구간입니다.`;
  }
  return `${totalMessages}개의 대화가 축적되었습니다. 이제 결의 성장 흔적을 활동과 앨범에서 함께 회고해보세요.`;
}

function nextEvolutionHint(totalMessages: number, locale: "ko" | "en") {
  if (totalMessages <= 0) return locale === "en" ? "Send the first message to start the growth loop." : "첫 메시지를 보내면 성장 루프가 시작됩니다.";
  const remainder = totalMessages % 10;
  const toNext = remainder === 0 ? 10 : 10 - remainder;
  if (locale === "en") return `${toNext} more conversations until the next personality analysis stage.`;
  return `${toNext}번 더 대화하면 다음 성격 분석 구간에 도달합니다.`;
}

function formatHubTime(date: Date, locale: "ko" | "en") {
  return formatLocalizedTime(date, locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatHubShortDate(value: string, locale: "ko" | "en") {
  return formatLocalizedDate(value, locale, {
    month: "short",
    day: "numeric",
  });
}

export function WorldClassHub() {
  const { locale, t } = useTranslations();
  const { agentState } = useAgentStore();
  const { worldState } = useWorldStore();
  const { messages, isStreaming, sendMessage, pendingUsageMode } = useChatStore();

  const [now, setNow] = useState<Date>(new Date());
  const [missions, setMissions] = useState<Mission[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Mission[];
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item): item is Mission =>
          Boolean(item && typeof item.id === "string" && typeof item.title === "string" && typeof item.done === "boolean"),
      );
    } catch {
      return [];
    }
  });
  const [draftMission, setDraftMission] = useState("");
  const [recentItems, setRecentItems] = useState<HomeSummaryItem[]>([]);
  const [newItemsSinceLastVisit, setNewItemsSinceLastVisit] = useState<HomeSummaryItem[]>([]);
  const [recap, setRecap] = useState<HomeRecap | null>(null);
  const [showRecentPanel, setShowRecentPanel] = useState(false);
  const [showGrowthPanel, setShowGrowthPanel] = useState(false);
  const [showPlanningPanel, setShowPlanningPanel] = useState(false);
  const onboardingVariant = useFirstMessageOnboardingVariant();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(missions));
    } catch {
      // Ignore storage write errors in restricted environments.
    }
  }, [missions]);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        const res = await fetch("/api/home/summary", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({ recent_items: [], recap: null }));
        const items = (Array.isArray(json.recent_items) ? json.recent_items : []) as HomeSummaryItem[];
        if (cancelled) return;
        setRecentItems(items);
        setRecap((json.recap as HomeRecap | null) ?? null);

        if (typeof window === "undefined") return;
        const lastSeenAt = window.localStorage.getItem(HOME_LAST_SEEN_KEY);
        if (lastSeenAt) {
          const unseen = items.filter((item) => new Date(item.created_at).getTime() > new Date(lastSeenAt).getTime());
          setNewItemsSinceLastVisit(unseen.slice(0, 3));
        } else {
          setNewItemsSinceLastVisit(items.slice(0, 2));
        }
        window.localStorage.setItem(HOME_LAST_SEEN_KEY, new Date().toISOString());
      } catch {
        if (!cancelled) {
          setRecentItems([]);
          setNewItemsSinceLastVisit([]);
          setRecap(null);
        }
      }
    }

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const userMessages = useMemo(
    () => messages.filter((message) => message.role === "user").length,
    [messages],
  );
  const completed = useMemo(
    () => missions.reduce((acc, mission) => acc + (mission.done ? 1 : 0), 0),
    [missions],
  );

  const selfName = typeof agentState?.self_name === "string" ? agentState.self_name : "GYEOL";
  const totalMessages = typeof agentState?.total_messages === "number" ? agentState.total_messages : 0;
  const genLevel = typeof agentState?.gen_level === "number" ? agentState.gen_level : 1;
  const mood = typeof agentState?.mood === "string" ? agentState.mood : locale === "en" ? "No mood recorded yet" : "아직 감정 기록 없음";
  const vitalityRaw = typeof agentState?.vitality === "number" ? agentState.vitality : 0;
  const vitality = Math.min(1, Math.max(0, vitalityRaw));
  const weather = typeof worldState?.weather?.name === "string" ? worldState.weather.name : "Void";
  const hour = now.getHours();
  const sessionMessages = Math.max(totalMessages, userMessages);
  const isFirstSession = sessionMessages === 0;
  const firstSessionConfig = getFirstSessionVariants(locale)[onboardingVariant];
  const quickPrompts = isFirstSession ? firstSessionConfig.prompts : getReturningPrompts(locale);
  const primaryPrompt = quickPrompts[0];
  const summary = growthSummary(sessionMessages, locale);
  const evolutionHint = nextEvolutionHint(sessionMessages, locale);
  const appearance = resolveIdentityAppearance(
    {
      selfName,
      visual: (agentState?.visual as { color?: string | null; shape?: string | null; glow?: number | null; particles?: number | null; animation?: string | null; background?: string | null } | undefined) ?? null,
      genome: (agentState?.genome as { species?: string | null; mutations?: string[] | null } | undefined) ?? null,
      selfModel: (agentState?.self_model as { current_role?: string | null; identity_statement?: string | null } | undefined) ?? null,
      config: {
        mutation_trait: typeof (agentState?.config as Record<string, unknown> | undefined)?.mutation_trait === "string" ? String((agentState?.config as Record<string, unknown>).mutation_trait) : null,
        usage_profile: pendingUsageMode
          ? {
              ...(((agentState?.config as Record<string, unknown> | undefined)?.usage_profile as { primary_mode?: string | null; updated_at?: string | null } | undefined) ?? null),
              primary_mode: pendingUsageMode,
            }
          : (((agentState?.config as Record<string, unknown> | undefined)?.usage_profile as { primary_mode?: string | null; updated_at?: string | null } | undefined) ?? null),
      },
      genLevel,
      vitality,
      mood,
    },
    locale
  );

  const toggleMission = (id: string) => {
    setMissions((prev) => prev.map((mission) => (mission.id === id ? { ...mission, done: !mission.done } : mission)));
  };

  const removeMission = (id: string) => {
    setMissions((prev) => prev.filter((mission) => mission.id !== id));
  };

  const addMission = () => {
    const title = draftMission.trim();
    if (!title) return;
    trackClientEvent(CLIENT_EVENT.missionCreated, {
      has_existing_messages: sessionMessages > 0,
      source: "world_class_hub",
      title_length: title.length,
    });
    setMissions((prev) => [{ id: crypto.randomUUID(), title, done: false }, ...prev].slice(0, 6));
    setDraftMission("");
  };

  const missionElements = (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/35 p-3">
      <div className="flex gap-2">
        <label htmlFor="mission-input" className="sr-only">
          {locale === "en" ? "Enter today's mission" : "오늘의 미션 입력"}
        </label>
        <input
          id="mission-input"
          value={draftMission}
          onChange={(event) => setDraftMission(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addMission();
            }
          }}
          placeholder={t("home.missionPlaceholder")}
          className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-0 placeholder:text-white/50 focus:bg-white/10"
        />
        <button
          type="button"
          onClick={addMission}
          className="rounded-lg bg-white/10 px-3 text-sm text-white/85 hover:bg-white/20"
        >
          {t("home.missionAdd")}
        </button>
      </div>
      <ul className="mt-2 space-y-1.5">
        {missions.length === 0 && (
          <li className="text-xs text-white/60">
            {isFirstSession ? t("home.missionEmptyFirst") : t("home.missionEmptyReturning")}
          </li>
        )}
        {missions.map((mission) => (
          <li key={mission.id} className="flex items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => toggleMission(mission.id)}
              className={`h-4 w-4 rounded border ${mission.done ? "bg-cyan-300 border-cyan-200" : "border-white/40"}`}
              aria-label={locale === "en" ? "Toggle mission completion" : "미션 완료 토글"}
            />
            <span className={`flex-1 ${mission.done ? "line-through text-white/60" : "text-white/85"}`}>{mission.title}</span>
            <button
              type="button"
              onClick={() => removeMission(mission.id)}
              className="text-xs text-white/55 hover:text-white/70"
            >
              {t("home.missionDelete")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  if (isFirstSession) {
    return (
      <section className="fixed left-1/2 top-14 z-20 w-[min(760px,calc(100%-1.5rem))] -translate-x-1/2 rounded-[2rem] border border-white/15 bg-black/45 p-4 shadow-[0_0_80px_rgba(80,128,255,0.18)] backdrop-blur-xl">
        <div className="absolute inset-0 pointer-events-none rounded-[2rem] aurora-flow opacity-55" />
        <div className="relative rounded-[1.5rem] border border-white/10 bg-black/35 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
            <span>{t("home.firstMinute")}</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/60 normal-case tracking-normal">
              {selfName}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {firstSessionConfig.heading}
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/68 sm:text-base">
            {firstSessionConfig.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span
              className="rounded-full border px-3 py-1.5 text-xs"
              style={{
                borderColor: `${appearance.palette.primary}35`,
                background: `${appearance.palette.primary}14`,
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {appearance.title}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/78">
              {locale === "en" ? `Weather · ${weather}` : `날씨 · ${weather}`}
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/78">
              {t("chat.vitality")} · {Math.round(vitality * 100)}%
            </span>
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/78">
              Gen {genLevel}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (!isStreaming) {
                  void sendMessage(primaryPrompt, {
                    experiment_key: EXPERIMENT.firstMessageOnboarding,
                    experiment_variant: onboardingVariant,
                    source: "cta",
                  });
                }
              }}
              disabled={isStreaming}
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-50"
            >
              {firstSessionConfig.cta}
            </button>
            <Link
              href="/features"
              className="rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm text-white/85 hover:bg-white/10"
            >
              {t("home.viewFlow")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="fixed top-14 left-1/2 -translate-x-1/2 z-20 w-[min(920px,calc(100%-1.5rem))] rounded-2xl border border-white/15 bg-black/45 p-4 backdrop-blur-xl shadow-[0_0_80px_rgba(80,128,255,0.18)]">
      <div className="absolute inset-0 pointer-events-none rounded-2xl aurora-flow opacity-55" />
      <div className="relative space-y-4">
        <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
                {isFirstSession ? t("home.firstMinute") : t("home.todaysStart")}
              </p>
              <h2 className="mt-2 text-lg font-semibold">
                {isFirstSession
                  ? firstSessionConfig.heading
                  : locale === "en"
                    ? `It is time to begin today's conversation with ${selfName}.`
                    : `${selfName}과 오늘의 대화를 시작할 시간이에요`}
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/68">
                {isFirstSession
                  ? firstSessionConfig.description
                  : locale === "en"
                    ? `${selfName} responds on top of the memories already built. A quick note about your condition, concern, or goal is enough to start today's flow.`
                    : `${selfName}은 이미 쌓인 기억 위에서 반응합니다. 지금 컨디션, 고민, 목표 중 하나만 꺼내도 충분히 오늘의 흐름이 시작됩니다.`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!isStreaming) {
                    void sendMessage(primaryPrompt, {
                      experiment_key: EXPERIMENT.firstMessageOnboarding,
                      experiment_variant: onboardingVariant,
                      source: "cta",
                    });
                  }
                }}
                disabled={isStreaming}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
              >
                {isFirstSession ? firstSessionConfig.cta : t("home.continueChat")}
              </button>
              <Link
                href={isFirstSession ? "/features" : "/activity"}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
              >
                {isFirstSession ? t("home.viewFlow") : t("home.recentTraces")}
              </Link>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wider text-white/60">1. {t("home.firstAction")}</p>
              <p className="mt-1 text-sm text-white/85">
                {sessionMessages > 0
                  ? locale === "en"
                    ? "The conversation has started. Change now begins to accumulate."
                    : "대화가 시작되었습니다. 이제 변화가 누적됩니다."
                  : locale === "en"
                    ? "Send the first message with one suggested prompt."
                    : "추천 질문 하나로 첫 메시지를 보내보세요."}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wider text-white/60">2. {t("home.todaysFocus")}</p>
              <p className="mt-1 text-sm text-white/85">
                {missions.length > 0
                  ? locale === "en"
                    ? "A mission is ready. Keep today's flow moving."
                    : "미션이 준비되었습니다. 오늘의 흐름을 이어가세요."
                  : locale === "en"
                    ? "Even one mission makes the day feel much clearer."
                    : "미션 1개만 적어도 하루가 훨씬 선명해집니다."}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-wider text-white/60">3. {t("home.nextCheck")}</p>
              <p className="mt-1 text-sm text-white/85">
                {locale === "en"
                  ? "Revisit traces, first shifts, and growth milestones in activity and album."
                  : "활동과 앨범에서 결이 남긴 흔적, 첫 변화, 성장 마일스톤을 다시 확인할 수 있습니다."}
              </p>
            </div>
          </div>
        </div>

        <GlobalFeedTicker />

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <WorldClassHubPresenceColumn
            appearance={appearance}
            currentPresenceLabel={t("home.currentPresence")}
            greeting={t(`home.greeting.${greetingKeyByHour(hour)}`)}
            isStreaming={isStreaming}
            quickPrompts={quickPrompts}
            selfName={selfName}
            sendPrompt={(prompt) => {
              if (!isStreaming) {
                void sendMessage(prompt, {
                  experiment_key: isFirstSession ? EXPERIMENT.firstMessageOnboarding : undefined,
                  experiment_variant: isFirstSession ? onboardingVariant : undefined,
                  source: "prompt",
                });
              }
            }}
            timeLabel={formatHubTime(now, locale)}
            vitality={vitality}
            vitalityHint={t(`home.vitalityHint.${vitalityHintKey(vitality)}`)}
            vitalityLabel={t("home.currentVitality")}
            weather={weather}
          />

          <WorldClassHubAside
            evolutionHint={evolutionHint}
            formatDate={(value) => formatHubShortDate(value, locale)}
            genLevel={genLevel}
            locale={locale}
            missionElements={missionElements}
            mood={mood}
            newItemsSinceLastVisit={newItemsSinceLastVisit}
            quickLinks={QUICK_LINKS.map((link) => ({ href: link.href, label: t(link.labelKey) }))}
            recentItems={recentItems}
            recap={recap}
            showGrowthPanel={showGrowthPanel}
            showPlanningPanel={showPlanningPanel}
            showRecentPanel={showRecentPanel}
            summary={summary}
            t={t}
            toggleGrowthPanel={() => setShowGrowthPanel((prev) => !prev)}
            togglePlanningPanel={() => setShowPlanningPanel((prev) => !prev)}
            toggleRecentPanel={() => setShowRecentPanel((prev) => !prev)}
            totalMessages={sessionMessages}
            completionRate={completed}
          />
        </div>
      </div>
    </section>
  );
}
