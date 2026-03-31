"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Locale } from "@/lib/i18n/config";
import { useAgentStore } from "@/store/agent-store";
import { useChatStore } from "@/store/chat-store";
import { useWorldStore } from "@/store/world-store";
import { useTranslations } from "@/components/i18n-provider";
import { StreakDisplay } from "@/components/streak-display";
import { WeeklyEventCard } from "@/components/weekly-event-card";
import { formatLocalizedTime } from "@/lib/i18n/format";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { haptic } from "@/lib/micro-interactions";
import { ActiveCounter } from "@/components/active-counter";
import { ComebackBanner } from "@/components/comeback-banner";
import { RewardExpiryCountdown } from "@/components/reward-expiry-countdown";
import { DuoStreakAlertBanner } from "@/components/duo-streak-alert-banner";

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

function ChevronIcon({ expanded, className }: { expanded: boolean; className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      animate={{ rotate: expanded ? 180 : 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
    >
      <path d="M6 9l6 6 6-6" />
    </motion.svg>
  );
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
  // Start collapsed if messages exist; expand if empty
  const hasMessages = messages.length > 0;
  const [expanded, setExpanded] = useState(() => !hasMessages);
  const [wasEmpty, setWasEmpty] = useState(() => !hasMessages);

  // Collapse once first message arrives (transition from empty → non-empty)
  if (hasMessages && wasEmpty) {
    setWasEmpty(false);
    setExpanded(false);
  }

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
  const mood = typeof agentState?.mood === "string" ? agentState.mood : null;
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

  const toggleExpanded = useCallback(() => {
    haptic("tap");
    setExpanded((prev) => !prev);
  }, []);

  return (
    <div className="relative z-10 mx-auto w-full max-w-[720px] px-2 pt-3">
      <ComebackBanner />
      <DuoStreakAlertBanner />
      <motion.section
        className="overflow-hidden rounded-[2rem] border border-white/15 bg-black/55 shadow-[0_0_80px_rgba(80,128,255,0.16)] backdrop-blur-xl"
        layout
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="absolute inset-0 pointer-events-none rounded-[2rem] aurora-flow opacity-45" />

        {/* Collapsed header — always visible */}
        <button
          type="button"
          onClick={toggleExpanded}
          className="relative flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
          aria-expanded={expanded}
          aria-controls="hub-details"
        >
          {/* Vitality ring */}
          <div className="relative flex-shrink-0">
            <svg width="44" height="44" viewBox="0 0 44 44" className="drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
              <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle
                cx="22"
                cy="22"
                r="19"
                fill="none"
                stroke={appearance.palette.primary}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${vitality * 119.38} 119.38`}
                transform="rotate(-90 22 22)"
                className="transition-all duration-700"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
              {Math.round(vitality * 100)}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{headerTitle}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-white/60">
              <span>Gen {genLevel}</span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>{weather}</span>
              {mood && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <span className="text-purple-300/80">{mood}</span>
                </>
              )}
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>{formatHubTime(now, locale)}</span>
              {streakDays > 0 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/30" />
                  <span className="text-amber-300">
                    {t("home.streakDaysShort").replace("{count}", String(streakDays))}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <ActiveCounter compact />
            <ChevronIcon expanded={expanded} className="h-4 w-4 text-white/50" />
          </div>
        </button>

        {/* Expanded details */}
        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              id="hub-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="space-y-4 border-t border-white/10 px-5 pb-5 pt-4">
                <p className="text-sm leading-6 text-white/82">{headerBody}</p>

                {/* Status pills */}
                <div className="flex flex-wrap gap-2">
                  <span
                    className="rounded-full border px-3 py-1.5 text-xs font-medium"
                    style={{
                      borderColor: `${appearance.palette.primary}35`,
                      background: `${appearance.palette.primary}14`,
                      color: "rgba(255,255,255,0.9)",
                    }}
                  >
                    {appearance.title}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85">
                    {`${t("home.weatherLabel")} \u00b7 ${weather}`}
                  </span>
                  {mood && (
                    <span className="rounded-full border border-purple-400/25 bg-purple-400/10 px-3 py-1.5 text-xs text-purple-200/90">
                      {`${t("home.currentMood")} \u00b7 ${mood}`}
                    </span>
                  )}
                  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85">
                    {t("home.sessionMessagesLabel").replace("{count}", String(sessionMessages))}
                  </span>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-200/85">
                    {`${t("home.currentVitality")} \u00b7 ${Math.round(vitality * 100)}%`}
                  </span>
                </div>

                {/* Growth + prompts */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-medium text-white">{t("home.currentPresence")}</p>
                  <p className="mt-2 text-sm leading-6 text-white/80">
                    {getGrowthCopy(sessionMessages, t)}
                  </p>
                  {isFirstSession ? (
                    <p className="mt-3 text-sm text-white/82">
                      {t("home.firstSessionHint")}
                    </p>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {quickPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => {
                            if (!isStreaming) {
                              void sendMessage(prompt, { source: "prompt", locale, totalMessages });
                            }
                          }}
                          disabled={isStreaming}
                          className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-left text-sm text-white/88 transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Streak + rewards */}
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-sm font-medium text-white">{t("home.streakAndNext")}</p>
                    <div className="mt-3">
                      <StreakDisplay
                        days={streakDays}
                        todayActive={recap?.streak.today_active ?? false}
                        weeklyActivity={weeklyActivity}
                        locale={locale}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <RewardExpiryCountdown />
                    <p className="text-sm font-medium text-white">{t("home.rewardLoop")}</p>
                    <p className="mt-1 text-xs text-white/65">
                      {rewardProgress.messagesUntilGuaranteed <= 0
                        ? t("home.rewardGuaranteed")
                        : t("home.rewardCountdown").replace("{count}", String(rewardProgress.messagesUntilGuaranteed))}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                        <motion.div
                          className="h-2 rounded-full"
                          style={{
                            background: `linear-gradient(90deg, ${appearance.palette.primary}, ${appearance.palette.secondary})`,
                          }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min(100, (rewardProgress.messagesSinceReward / rewardProgress.guaranteedEvery) * 100)}%`,
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <span className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-2 py-1 text-xs font-medium text-cyan-100/90">
                        x{rewardProgress.streakMultiplier}
                      </span>
                    </div>
                    {rewardInventoryRows.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {rewardInventoryRows.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs text-white/85"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-3">
                      <WeeklyEventCard locale={locale} progress={weeklyEventProgress} compact />
                    </div>
                  </div>
                </div>

                {/* Quick links */}
                <div className="flex gap-2">
                  <Link
                    href="/discover"
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/88 transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
                  >
                    {t("home.openDiscover")}
                  </Link>
                  <Link
                    href="/settings"
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/88 transition-all hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
                  >
                    {t("nav.settings")}
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>
    </div>
  );
}
