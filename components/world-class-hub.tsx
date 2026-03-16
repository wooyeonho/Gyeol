"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { useAgentStore } from "@/store/agent-store";
import { useChatStore } from "@/store/chat-store";
import { useWorldStore } from "@/store/world-store";
import { useTranslations } from "@/components/i18n-provider";
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

function getReturningPrompts(_locale: Locale, t: (key: string) => string) {
  return [
    t("home.returningPrompt1"),
    t("home.returningPrompt2"),
    t("home.returningPrompt3"),
  ];
}

function formatHubTime(date: Date, locale: Locale) {
  return formatLocalizedTime(date, locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getGrowthCopy(totalMessages: number, t: (key: string) => string) {
  if (totalMessages <= 0) {
    return t("home.growthFirst");
  }
  if (totalMessages < 10) {
    return t("home.growthEarly").replace("{count}", String(totalMessages));
  }
  return t("home.growthMature").replace("{count}", String(totalMessages));
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
  const quickPrompts = getReturningPrompts(locale, t);
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
    rewardInventory.coins ? `${rewardInventory.coins} ${t("home.rewardCoins")}` : null,
    rewardInventory.evolution_points ? `${rewardInventory.evolution_points} ${t("home.rewardEvo")}` : null,
    rewardInventory.title_shards ? `${rewardInventory.title_shards} ${t("home.rewardTitleShards")}` : null,
    rewardInventory.appearance_shards ? `${rewardInventory.appearance_shards} ${t("home.rewardAppearance")}` : null,
    rewardInventory.streak_freezes ? `${rewardInventory.streak_freezes} ${t("home.rewardFreeze")}` : null,
  ].filter(Boolean);
  const headerTitle = isFirstSession
    ? t("home.meetTitle").replace("{name}", selfName)
    : t("home.startTitle").replace("{name}", selfName);
  const headerBody = isFirstSession
    ? t("home.firstSessionBody")
    : t("home.returningBody");

  return (
    <section className="pointer-events-none fixed left-1/2 top-4 z-20 w-[min(720px,calc(100%-1rem))] -translate-x-1/2">
      <div className="pointer-events-auto rounded-[2rem] border border-white/15 bg-black/55 p-4 shadow-[0_0_80px_rgba(80,128,255,0.16)] backdrop-blur-xl">
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
            {`${t("home.weatherLabel")} · ${weather}`}
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85">
            Gen {genLevel}
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85">
            {t("home.sessionMessagesLabel").replace("{count}", String(sessionMessages))}
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-medium text-white">{t("home.currentPresence")}</p>
            <p className="mt-2 text-sm leading-6 text-white/80">
              {getGrowthCopy(sessionMessages, t)}
            </p>
            {isFirstSession ? (
              <p className="mt-4 text-sm text-white/82">
                {t("home.firstSessionHint")}
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      if (!isStreaming) {
                        void sendMessage(prompt, { source: "prompt", locale });
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
              {t("home.streakAndNext")}
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
                    {t("home.rewardLoop")}
                  </p>
                  <p className="mt-1 text-sm text-white/78">
                    {rewardProgress.messagesUntilGuaranteed <= 0
                      ? t("home.rewardGuaranteed")
                      : t("home.rewardCountdown").replace("{count}", String(rewardProgress.messagesUntilGuaranteed))}
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
                    {t("home.rewardInventoryEmpty")}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-4">
              <WeeklyEventCard locale={locale} progress={weeklyEventProgress} compact />
            </div>
            <p className="mt-4 text-sm leading-6 text-white/80">
              {recap?.next_action ?? t("home.discoverHint")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/discover"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white/88 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                {t("home.openDiscover")}
              </Link>
              <Link
                href="/settings"
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-base text-white/88 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                {t("home.openProfile")}
              </Link>
            </div>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
