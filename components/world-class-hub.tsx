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
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

type Mission = {
  id: string;
  title: string;
  done: boolean;
};

type HomeSummaryItem = {
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
      identity: {
        cta: "Start with a greeting",
        description: "You do not need a long introduction. A single line about yourself or one suggested question is enough to begin the relationship.",
        heading: "Create Gyeol’s first memory with the first conversation",
        prompts: [
          "Ask how Gyeol should remember me from today.",
          "Help me write one sentence that describes who I am right now.",
          "Ask me three first questions so we can get to know each other.",
        ],
      },
      productivity: {
        cta: "Sort today’s problem",
        description: "Drop the one thing that feels blocked right now. Gyeol can shape the first focus and execution flow from there.",
        heading: "Let Gyeol take the first problem of today",
        prompts: [
          "Help me define the single problem I should solve first today.",
          "Set my top three priorities right now.",
          "Build a 15-minute action plan from my current state.",
        ],
      },
    } as const;
  }
  return {
    identity: {
      cta: "첫 인사 시작하기",
      description: "긴 소개는 필요 없습니다. 지금의 나를 한 줄로 말하거나, 아래 추천 질문 하나를 눌러 첫 관계를 시작해보세요.",
      heading: "첫 대화로 결의 첫 기억을 만들어보세요",
      prompts: [
        "안녕, 오늘부터 나를 어떻게 기억하면 좋을지 물어봐줘.",
        "지금의 나를 설명하는 첫 문장을 같이 만들어줘.",
        "우리 관계를 시작하는 첫 질문 3개를 해줘.",
      ],
    },
    productivity: {
      cta: "오늘의 문제 정리하기",
      description: "지금 가장 신경 쓰이는 문제 하나만 던져보세요. 결이 바로 오늘의 초점과 실행 흐름을 정리해줄 수 있습니다.",
      heading: "결에게 오늘의 문제를 먼저 맡겨보세요",
      prompts: [
        "오늘 가장 먼저 정리해야 할 문제를 같이 정리해줘.",
        "지금 해야 할 일의 우선순위를 3개만 잡아줘.",
        "내 상태를 보고 바로 실행 가능한 15분 플랜을 짜줘.",
      ],
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
  return date.toLocaleTimeString(locale === "en" ? "en-US" : "ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatHubShortDate(value: string, locale: "ko" | "en") {
  return new Date(value).toLocaleDateString(locale === "en" ? "en-US" : "ko-KR", {
    month: "short",
    day: "numeric",
  });
}

export function WorldClassHub() {
  const { locale, t } = useTranslations();
  const { agentState } = useAgentStore();
  const { worldState } = useWorldStore();
  const { messages, isStreaming, sendMessage } = useChatStore();

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
  const completionRate = missions.length === 0 ? 0 : Math.round((completed / missions.length) * 100);

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
        usage_profile: ((agentState?.config as Record<string, unknown> | undefined)?.usage_profile as { primary_mode?: string | null; updated_at?: string | null } | undefined) ?? null,
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
              <p className="text-[11px] uppercase tracking-wider text-white/45">1. {t("home.firstAction")}</p>
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
              <p className="text-[11px] uppercase tracking-wider text-white/45">2. {t("home.todaysFocus")}</p>
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
              <p className="text-[11px] uppercase tracking-wider text-white/45">3. {t("home.nextCheck")}</p>
              <p className="mt-1 text-sm text-white/85">
                {locale === "en"
                  ? "Revisit traces, first shifts, and growth milestones in activity and album."
                  : "활동과 앨범에서 결이 남긴 흔적, 첫 변화, 성장 마일스톤을 다시 확인할 수 있습니다."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-lg md:text-xl font-semibold">{selfName}</h1>
            <span className="text-xs rounded-full bg-white/10 px-2 py-1 text-white/80">{weather}</span>
            <span className="text-xs text-white/60">
              {formatHubTime(now, locale)}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-white/75">{t(`home.greeting.${greetingKeyByHour(hour)}`)}</p>
            <p className="text-xs text-white/55">{t(`home.vitalityHint.${vitalityHintKey(vitality)}`)}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-start gap-3">
              <IdentityPresence appearance={appearance} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                  {locale === "en" ? "current manifestation" : "현재 형상"}
                </p>
                <p className="mt-1 text-sm font-medium text-white">{appearance.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/58">{appearance.usageNarrative ?? appearance.subtitle}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {appearance.chips.map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border px-2 py-1 text-[11px]"
                      style={{
                        borderColor: `${appearance.palette.primary}30`,
                        background: `${appearance.palette.primary}12`,
                        color: "rgba(255,255,255,0.82)",
                      }}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>{t("home.currentVitality")}</span>
              <span>{Math.round(vitality * 100)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-violet-400 to-cyan-300 transition-all duration-500"
                style={{ width: `${Math.max(4, vitality * 100)}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => {
                  if (!isStreaming) {
                    void sendMessage(prompt, {
                      experiment_key: isFirstSession ? EXPERIMENT.firstMessageOnboarding : undefined,
                      experiment_variant: isFirstSession ? onboardingVariant : undefined,
                      source: "prompt",
                    });
                  }
                }}
                disabled={isStreaming}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 hover:bg-white/10 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/50">{locale === "en" ? "stored conversations" : "기록된 대화"}</p>
              <p className="text-xl font-semibold">{sessionMessages}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-wider text-white/50">{locale === "en" ? "mission completion" : "미션 달성률"}</p>
              <p className="text-xl font-semibold">{completionRate}%</p>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/45">{locale === "en" ? "recent change" : "최근 변화"}</p>
                <p className="mt-1 text-sm font-medium text-white">{summary}</p>
              </div>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70">
                Gen {genLevel}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{locale === "en" ? "current mood" : "현재 기분"}</p>
                <p className="mt-1 text-sm text-white/82">{mood}</p>
              </div>
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{locale === "en" ? "next evolution point" : "다음 변화 포인트"}</p>
                <p className="mt-1 text-sm text-white/82">{evolutionHint}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/activity"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                {locale === "en" ? "View changes in activity" : "활동에서 변화 보기"}
              </Link>
              <Link
                href="/album"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                {locale === "en" ? "View milestones in album" : "앨범에서 마일스톤 보기"}
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/45">{locale === "en" ? "while you were away" : "당신이 없는 동안"}</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {newItemsSinceLastVisit.length > 0
                    ? locale === "en"
                      ? `${newItemsSinceLastVisit.length} new traces were recorded.`
                      : `${newItemsSinceLastVisit.length}개의 새로운 흔적이 기록되었습니다.`
                    : t("home.recentFallback")}
                </p>
              </div>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70">
                {locale === "en" ? `${recentItems.length} recent` : `최근 ${recentItems.length}개`}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {(newItemsSinceLastVisit.length > 0 ? newItemsSinceLastVisit : recentItems.slice(0, 3)).map((item) => (
                <div key={`${item.kind}-${item.id}`} className="rounded-lg bg-black/25 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-white/55">{item.kind === "milestone" ? (locale === "en" ? "Milestone" : "마일스톤") : (locale === "en" ? "Activity" : "활동")}</p>
                    <p className="text-[11px] text-white/40">
                      {formatHubShortDate(item.created_at, locale)}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-white/82">{item.title}</p>
                </div>
              ))}
              {recentItems.length === 0 && (
                <div className="rounded-lg bg-black/25 p-3 text-sm text-white/55">
                  {locale === "en"
                    ? "Once the first activity appears, a recent change summary will show up here."
                    : "첫 활동이 생기면 여기에서 최근 변화 요약을 바로 볼 수 있습니다."}
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/activity"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                {locale === "en" ? "Open recent activity" : "최근 활동 열기"}
              </Link>
              <Link
                href="/album"
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                {locale === "en" ? "Open album again" : "앨범 다시 보기"}
              </Link>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.retentionLoop")}</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {recap?.next_action ?? t("home.retentionFallback")}
                </p>
              </div>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70">
                {locale === "en" ? `streak ${recap?.streak.days ?? 0}` : `연속 ${recap?.streak.days ?? 0}일`}
              </span>
            </div>
            {recap?.premium_locked && (
              <div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-400/10 p-3">
                <p className="text-xs text-cyan-100/75">PRO RECAP</p>
                <p className="mt-1 text-sm text-cyan-50">
                  {locale === "en"
                    ? "Deeper weekly recaps and longer history summaries open on Pro and above."
                    : "더 깊은 주간 리캡과 장기 히스토리 요약은 Pro 이상에서 열립니다."}
                </p>
                <Link
                  href="/plans"
                  className="mt-3 inline-block rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15"
                >
                  {locale === "en" ? "See upgrade plans" : "플랜 업그레이드 보기"}
                </Link>
              </div>
            )}
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.today")}</p>
                <p className="mt-1 text-sm text-white/82">
                  {locale === "en"
                    ? `Messages ${recap?.today.user_messages ?? 0} · Activity ${recap?.today.activities ?? 0}`
                    : `메시지 ${recap?.today.user_messages ?? 0} · 활동 ${recap?.today.activities ?? 0}`}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {recap?.streak.today_active ? t("home.todayDone") : t("home.todayEmpty")}
                </p>
              </div>
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.thisWeek")}</p>
                <p className="mt-1 text-sm text-white/82">
                  {locale === "en"
                    ? `Messages ${recap?.weekly.user_messages ?? 0} · Milestones ${recap?.weekly.milestones ?? 0}`
                    : `대화 ${recap?.weekly.user_messages ?? 0} · 마일스톤 ${recap?.weekly.milestones ?? 0}`}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {locale === "en" ? `Artifacts ${recap?.weekly.artifacts ?? 0}` : `아티팩트 ${recap?.weekly.artifacts ?? 0}개`}
                </p>
              </div>
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.weeklyHighlight")}</p>
                <p className="mt-1 text-sm text-white/82">
                  {recap?.weekly.highlight ?? t("home.weeklyFallback")}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/45">{t("home.goalLoop")}</p>
                <p className="mt-1 text-sm font-medium text-white">
                  {recap?.goal_loop?.next_action ?? recap?.goal_loop?.active_goal ?? t("home.goalLoopSummaryEmpty")}
                </p>
              </div>
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/70">
                {locale === "en"
                  ? `${recap?.goal_loop?.pending_count ?? 0} tasks`
                  : `대기 태스크 ${recap?.goal_loop?.pending_count ?? 0}개`}
              </span>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{locale === "en" ? "current goal" : "현재 목표"}</p>
                <p className="mt-1 text-sm text-white/82">
                  {recap?.goal_loop?.active_goal ?? t("home.goalLoopCurrentEmpty")}
                </p>
              </div>
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{locale === "en" ? "long-term direction" : "장기 방향"}</p>
                <p className="mt-1 text-sm text-white/82">
                  {recap?.goal_loop?.long_term_goal ?? recap?.goal_loop?.active_goal ?? t("home.goalLoopCurrentEmpty")}
                </p>
              </div>
              <div className="rounded-lg bg-black/25 p-3">
                <p className="text-[10px] uppercase tracking-wider text-white/45">{locale === "en" ? "research next" : "추가 조사 포인트"}</p>
                <p className="mt-1 text-sm text-white/82">
                  {recap?.goal_loop?.latest_task ??
                    recap?.goal_loop?.research_focus ??
                    t("home.goalLoopResearchEmpty")}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 p-3">
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
                className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-sm outline-none ring-0 placeholder:text-white/35 focus:bg-white/10"
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
                <li className="text-xs text-white/45">
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
                  <span className={`flex-1 ${mission.done ? "line-through text-white/45" : "text-white/85"}`}>{mission.title}</span>
                  <button
                    type="button"
                    onClick={() => removeMission(mission.id)}
                    className="text-xs text-white/40 hover:text-white/70"
                  >
                    {t("home.missionDelete")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
