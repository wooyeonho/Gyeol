"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAgentStore } from "@/store/agent-store";
import { useChatStore } from "@/store/chat-store";
import { useWorldStore } from "@/store/world-store";
import { useTranslations } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n/config";
import { StreakDisplay } from "@/components/streak-display";
import { WeeklyEventCard } from "@/components/weekly-event-card";
import { formatLocalizedTime } from "@/lib/i18n/format";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

export type HomeSummaryItem = {
  id: string;
  kind: "activity" | "milestone";
  title: string;
  created_at: string;
};

type HomeRecap = {
  next_action: string;
  streak: {
    days: number;
    today_active: boolean;
    weekly_activity?: boolean[];
  };
  weekly: {
    artifacts: number;
    highlight: string;
    milestones: number;
    user_messages: number;
  };
};

function getReturningPrompts(locale: Locale) {
  return locale === "en"
    ? [
        "Tell me the one thing I should focus on today.",
        "Summarize how my mood looks right now.",
        "Build a short action plan from my current state.",
      ]
    : [
        "오늘 내가 집중해야 할 1가지만 알려줘.",
        "지금 내 상태를 짧게 정리해줘.",
        "현재 상태를 바탕으로 짧은 실행 계획을 만들어줘.",
      ];
}

function formatHubTime(date: Date, locale: Locale) {
  return formatLocalizedTime(date, locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getGrowthCopy(totalMessages: number, locale: Locale) {
  if (locale === "en") {
    if (totalMessages <= 0) {
      return "Your first message opens memory, growth, and activity. Keep the first step simple.";
    }
    if (totalMessages < 10) {
      return `${totalMessages} messages are already building tone, memory, and a clearer sense of presence.`;
    }
    return `${totalMessages} messages are already stored. This is a good time to revisit change in Discover.`;
  }

  if (totalMessages <= 0) {
    return "첫 메시지를 보내면 기억, 성장, 활동이 함께 열립니다. 일단 가볍게 시작해보세요.";
  }
  if (totalMessages < 10) {
    return `${totalMessages}개의 메시지가 이미 쌓여 존재감과 기억의 톤이 만들어지고 있습니다.`;
  }
  return `${totalMessages}개의 메시지가 저장되어 있습니다. 이제 Discover에서 변화의 흔적을 다시 볼 수 있습니다.`;
}

export function WorldClassHub() {
  const { locale, t } = useTranslations();
  const { agentState } = useAgentStore();
  const { worldState } = useWorldStore();
  const {
    messages,
    isStreaming,
    sendMessage,
    pendingUsageMode,
    rewardInventory,
    rewardProgress,
    weeklyEventProgress,
  } = useChatStore();

  const [now, setNow] = useState(new Date());
  const [recap, setRecap] = useState<HomeRecap | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        const res = await fetch("/api/home/summary", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json().catch(() => ({ recap: null }));
        if (!cancelled) {
          setRecap((json.recap as HomeRecap | null) ?? null);
        }
      } catch {
        if (!cancelled) {
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

  const selfName = typeof agentState?.self_name === "string" ? agentState.self_name : "GYEOL";
  const totalMessages = typeof agentState?.total_messages === "number" ? agentState.total_messages : 0;
  const genLevel = typeof agentState?.gen_level === "number" ? agentState.gen_level : 1;
  const vitalityRaw = typeof agentState?.vitality === "number" ? agentState.vitality : 0;
  const vitality = Math.min(1, Math.max(0, vitalityRaw));
  const weather = typeof worldState?.weather?.name === "string" ? worldState.weather.name : "Void";
  const sessionMessages = Math.max(totalMessages, userMessages);
  const isFirstSession = sessionMessages === 0;
  const quickPrompts = getReturningPrompts(locale);
  const appearance = resolveIdentityAppearance(
    {
      selfName,
      visual: (agentState?.visual as {
        color?: string | null;
        shape?: string | null;
        glow?: number | null;
        particles?: number | null;
        animation?: string | null;
        background?: string | null;
      } | undefined) ?? null,
      genome: (agentState?.genome as { species?: string | null; mutations?: string[] | null } | undefined) ?? null,
      selfModel: (agentState?.self_model as {
        current_role?: string | null;
        identity_statement?: string | null;
      } | undefined) ?? null,
      config: {
        mutation_trait:
          typeof (agentState?.config as Record<string, unknown> | undefined)?.mutation_trait === "string"
            ? String((agentState?.config as Record<string, unknown>).mutation_trait)
            : null,
        usage_profile: pendingUsageMode
          ? {
              ...(((agentState?.config as Record<string, unknown> | undefined)?.usage_profile as {
                primary_mode?: string | null;
                updated_at?: string | null;
              } | undefined) ?? null),
              primary_mode: pendingUsageMode,
            }
          : (((agentState?.config as Record<string, unknown> | undefined)?.usage_profile as {
              primary_mode?: string | null;
              updated_at?: string | null;
            } | undefined) ?? null),
      },
      genLevel,
      vitality,
      mood: typeof agentState?.mood === "string" ? agentState.mood : null,
    },
    locale,
  );

  const streakDays = recap?.streak.days ?? 0;
  const weeklyActivity = recap?.streak.weekly_activity ?? [];
  const rewardInventoryRows = [
    rewardInventory.coins ? `${rewardInventory.coins}${locale === "en" ? " coins" : " 코인"}` : null,
    rewardInventory.evolution_points ? `${rewardInventory.evolution_points}${locale === "en" ? " evo" : " 진화"}` : null,
    rewardInventory.title_shards ? `${rewardInventory.title_shards}${locale === "en" ? " title" : " 칭호"}` : null,
    rewardInventory.appearance_shards ? `${rewardInventory.appearance_shards}${locale === "en" ? " appearance" : " 외형"}` : null,
    rewardInventory.streak_freezes ? `${rewardInventory.streak_freezes}${locale === "en" ? " freeze" : " 프리즈"}` : null,
  ].filter(Boolean);
  const headerTitle = isFirstSession
    ? locale === "en"
      ? `Meet ${selfName} in one short conversation`
      : `${selfName}과 짧은 대화로 바로 시작하세요`
    : locale === "en"
      ? `Start today's conversation with ${selfName}`
      : `${selfName}과 오늘의 대화를 시작하세요`;
  const headerBody = isFirstSession
    ? locale === "en"
      ? "Skip the setup. Tap one suggestion below or type one short sentence to feel the value in under a few seconds."
      : "설정은 건너뛰고 바로 시작하세요. 아래 추천 질문을 누르거나 짧은 한 문장만 보내도 바로 가치를 느낄 수 있습니다."
    : locale === "en"
      ? "Home now stays focused on chat, streak, and a few quick prompts. Deeper traces and browsing have moved into Discover."
      : "이제 홈은 채팅, 스트릭, 짧은 퀵 프롬프트에 집중합니다. 더 자세한 흔적과 탐색은 Discover에서 볼 수 있습니다.";

  return (
    <section className="fixed left-1/2 top-4 z-20 w-[min(720px,calc(100%-1rem))] -translate-x-1/2 rounded-[2rem] border border-white/15 bg-black/55 p-4 shadow-[0_0_80px_rgba(80,128,255,0.16)] backdrop-blur-xl">
      <div className="absolute inset-0 pointer-events-none rounded-[2rem] aurora-flow opacity-45" />
      <div className="relative space-y-4 rounded-[1.5rem] border border-white/10 bg-black/35 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-100/85">
              {isFirstSession ? t("home.firstMinute") : t("home.todaysStart")}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
              {headerTitle}
            </h2>
            <p className="mt-3 text-base leading-7 text-white/82">
              {headerBody}
            </p>
          </div>
          <div className="min-w-[170px] rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-medium text-white">{t("home.currentVitality")}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{Math.round(vitality * 100)}%</p>
            <p className="mt-2 text-sm text-white/82">{appearance.title}</p>
            <p className="mt-1 text-sm text-white/72">{formatHubTime(now, locale)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className="rounded-full border px-3 py-2 text-sm"
            style={{
              borderColor: `${appearance.palette.primary}35`,
              background: `${appearance.palette.primary}14`,
              color: "rgba(255,255,255,0.9)",
            }}
          >
            {appearance.title}
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85">
            {locale === "en" ? `Weather · ${weather}` : `날씨 · ${weather}`}
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85">
            Gen {genLevel}
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85">
            {locale === "en" ? `${sessionMessages} messages` : `메시지 ${sessionMessages}개`}
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-medium text-white">{t("home.currentPresence")}</p>
            <p className="mt-2 text-sm leading-6 text-white/80">
              {getGrowthCopy(sessionMessages, locale)}
            </p>
            {isFirstSession ? (
              <p className="mt-4 text-sm text-white/82">
                {locale === "en"
                  ? "Use one of the three suggestions below or type directly into the input."
                  : "아래 추천 질문 3개 중 하나를 누르거나 입력창에 바로 적어보세요."}
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      if (!isStreaming) {
                        void sendMessage(prompt, { source: "prompt" });
                      }
                    }}
                    disabled={isStreaming}
                    className="min-h-12 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-left text-base text-white/88 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-medium text-white">
              {locale === "en" ? "Streak and next step" : "스트릭과 다음 단계"}
            </p>
            <div className="mt-4">
              <StreakDisplay
                days={streakDays}
                todayActive={recap?.streak.today_active ?? false}
                weeklyActivity={weeklyActivity}
                locale={locale}
              />
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">
                    {locale === "en" ? "Reward loop" : "보상 루프"}
                  </p>
                  <p className="mt-1 text-sm text-white/78">
                    {rewardProgress.messagesUntilGuaranteed <= 0
                      ? locale === "en"
                        ? "Your next message is guaranteed to drop a reward."
                        : "다음 메시지는 보상이 보장됩니다."
                      : locale === "en"
                        ? `${rewardProgress.messagesUntilGuaranteed} more messages until the guaranteed drop.`
                        : `보장 드롭까지 ${rewardProgress.messagesUntilGuaranteed}개 메시지 남았습니다.`}
                  </p>
                </div>
                <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100/90">
                  x{rewardProgress.streakMultiplier}
                </span>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (rewardProgress.messagesSinceReward / rewardProgress.guaranteedEvery) * 100)}%`,
                    background: `linear-gradient(90deg, ${appearance.palette.primary}, ${appearance.palette.secondary})`,
                  }}
                />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {rewardInventoryRows.length > 0 ? (
                  rewardInventoryRows.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/85"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-white/70">
                    {locale === "en"
                      ? "Your reward inventory will start filling after the first few messages."
                      : "몇 번의 대화만 지나면 보상 인벤토리가 채워지기 시작합니다."}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4">
              <WeeklyEventCard locale={locale} progress={weeklyEventProgress} compact />
            </div>
            <p className="mt-4 text-sm leading-6 text-white/80">
              {recap?.next_action ??
                (locale === "en"
                  ? "After chatting, open Discover to review activity, album, social, and ecosystem traces."
                  : "대화 후에는 Discover에서 활동, 앨범, 소셜, 생태계 흔적을 다시 확인하세요.")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/discover"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white/88 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                {locale === "en" ? "Open Discover" : "Discover 열기"}
              </Link>
              <Link
                href="/settings"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white/88 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                {locale === "en" ? "Open Profile" : "Profile 열기"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
