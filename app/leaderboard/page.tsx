"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { IdentityPresence } from "@/components/identity-presence";
import { WeeklyEventCard } from "@/components/weekly-event-card";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { AnimatedEmptyState } from "@/components/ui/animated-empty-state";
import type { LeaderboardEntry, LeaderboardResponse } from "@/app/api/leaderboard/route";
import { useChatStore } from "@/store/chat-store";

type Tab = "level" | "messages" | "vitality";

export default function LeaderboardPage() {
  const { locale, t } = useTranslations();
  const weeklyEventProgress = useChatStore((s) => s.weeklyEventProgress);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("level");
  const [shareNotice, setShareNotice] = useState<string | null>(null);
  const [followBusyId, setFollowBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch"))))
      .then((d: LeaderboardResponse) => setData(d))
      .catch(() => setError(t("leaderboard.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const entries: LeaderboardEntry[] = data
    ? tab === "level"
      ? data.byLevel
      : tab === "messages"
        ? data.byMessages
        : data.byVitality
    : [];

  const context = useMemo(() => {
    if (!data) return null;
    return tab === "level"
      ? data.contexts.level
      : tab === "messages"
        ? data.contexts.messages
        : data.contexts.vitality;
  }, [data, tab]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "level", label: t("leaderboard.tabLevel") },
    { key: "messages", label: t("leaderboard.tabMessages") },
    { key: "vitality", label: t("leaderboard.tabVitality") },
  ];
  const relationshipStats = useMemo(() => {
    const source = data?.byLevel ?? [];
    return {
      following: source.filter((entry) => entry.is_following).length,
      mutual: source.filter((entry) => entry.is_mutual).length,
    };
  }, [data]);

  async function handleShareProfile() {
    try {
      const res = await fetch("/api/share", { method: "POST" });
      const json = await res.json().catch(() => null);
      if (!res.ok || typeof json?.url !== "string") {
        setShareNotice(t("leaderboard.shareCardFailed"));
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json.url);
      }
      setShareNotice(t("leaderboard.shareCardCopied"));
      setTimeout(() => setShareNotice(null), 2400);
    } catch {
      setShareNotice(t("leaderboard.shareCardFailed"));
    }
  }

  function getMetricValue(entry: LeaderboardEntry) {
    if (tab === "level") return String(entry.gen_level);
    if (tab === "messages") return String(entry.total_messages);
    return `${Math.round(entry.vitality * 100)}%`;
  }

  function getMetricLabel() {
    if (tab === "level") return "Gen";
    if (tab === "messages") return t("leaderboard.msgs");
    return t("leaderboard.vitalityLabel");
  }

  async function handleFollow(agentId: string, shouldFollow: boolean) {
    setFollowBusyId(agentId);
    try {
      const res = await fetch("/api/social/follow", {
        method: shouldFollow ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_agent_id: agentId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError((json?.error as string) || t("leaderboard.loadError"));
        return;
      }

      setData((prev) => {
        if (!prev) return prev;
        const patchEntry = (entry: LeaderboardEntry) =>
          entry.agent_id === agentId
            ? { ...entry, is_following: shouldFollow, is_mutual: shouldFollow && Boolean(entry.is_followed_by) }
            : entry;
        return {
          ...prev,
          byLevel: prev.byLevel.map(patchEntry),
          byMessages: prev.byMessages.map(patchEntry),
          byVitality: prev.byVitality.map(patchEntry),
          contexts: {
            level: {
              ...prev.contexts.level,
              nearby: prev.contexts.level.nearby.map(patchEntry),
            },
            messages: {
              ...prev.contexts.messages,
              nearby: prev.contexts.messages.nearby.map(patchEntry),
            },
            vitality: {
              ...prev.contexts.vitality,
              nearby: prev.contexts.vitality.nearby.map(patchEntry),
            },
          },
        };
      });
    } finally {
      setFollowBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="theme-page min-h-screen flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="theme-page min-h-screen px-4 pb-24 pt-20">
      <div className="mx-auto max-w-5xl">
        <header className="theme-panel mb-6 rounded-[2rem] p-6 shadow-[0_0_80px_rgba(34,211,238,0.05)]">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-cyan-300">
            {t("leaderboard.eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {t("leaderboard.title")}
          </h1>
          <p className="theme-text-subtle mt-3 text-base leading-7">
            {t("leaderboard.subtitle")}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {data && (
              <div className="theme-subpanel inline-flex items-center gap-2 rounded-full px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="theme-text-subtle text-sm">
                  {t("leaderboard.totalAgents").replace("{count}", String(data.totalAgents))}
                </span>
              </div>
            )}
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-2 text-sm text-fuchsia-100/90">
              {t("leaderboard.top50")}
            </div>
            <div className="theme-subpanel inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm">
              <span className="theme-text-subtle">{t("social.following")}</span>
              <span className="font-medium text-white">{relationshipStats.following}</span>
            </div>
            <div className="theme-subpanel inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm">
              <span className="theme-text-subtle">{t("social.friendsTab")}</span>
              <span className="font-medium text-white">{relationshipStats.mutual}</span>
            </div>
          </div>
          {shareNotice && (
            <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100/90">
              {shareNotice}
            </div>
          )}
        </header>

        <div className="mb-4 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <WeeklyEventCard locale={locale} progress={weeklyEventProgress} />

          <section className="theme-panel rounded-[1.75rem] p-5">
            <p className="theme-text-subtle text-xs font-medium uppercase tracking-[0.2em]">
              {t("leaderboard.socialProof")}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              {t("leaderboard.socialProofTitle")}
            </h2>
            <p className="theme-text-subtle mt-3 text-sm leading-6">
              {t("leaderboard.socialProofBody")}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/compare"
                className="theme-subpanel inline-flex min-h-12 items-center justify-center rounded-2xl px-4 py-3 text-base theme-text-muted transition-colors hover:brightness-105"
              >
                {t("leaderboard.compareNow")}
              </Link>
              <button
                type="button"
                onClick={() => void handleShareProfile()}
                className="theme-subpanel inline-flex min-h-12 items-center justify-center rounded-2xl px-4 py-3 text-base theme-text-muted transition-colors hover:brightness-105"
              >
                {t("leaderboard.createShareCard")}
              </button>
            </div>
          </section>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map((tabOption) => (
            <button
              key={tabOption.key}
              type="button"
              onClick={() => setTab(tabOption.key)}
              className={`min-h-12 rounded-full px-4 py-2 text-base font-medium transition-colors ${
                tab === tabOption.key
                  ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-200"
                  : "theme-subpanel theme-text-subtle hover:brightness-105"
              }`}
            >
              {tabOption.label}
            </button>
          ))}
        </div>

        {context?.self && (
          <section className="mb-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="theme-panel-strong rounded-[1.75rem] p-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-100/80">
                {t("leaderboard.yourPosition")}
              </p>
              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black/25 text-2xl font-semibold text-white">
                  #{context.self.rank}
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {context.self.self_name || t("leaderboard.unnamedGyeol")}
                  </p>
                  <p className="theme-text-subtle mt-1 text-sm">
                    {`${getMetricValue(context.self)} ${getMetricLabel()} · ${t("leaderboard.keepPushing")}`}
                  </p>
                </div>
                {context.percentile !== null && (
                  <div className="ml-auto flex flex-col items-center rounded-2xl border border-fuchsia-300/20 bg-fuchsia-400/10 px-3 py-2">
                    <span className="text-lg font-bold text-fuchsia-200">
                      {t("leaderboard.topPercent").replace("{percent}", String(context.percentile))}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="theme-panel rounded-[1.75rem] p-5">
              <p className="theme-text-subtle text-xs font-medium uppercase tracking-[0.2em]">
                {t("leaderboard.nearbyRivals")}
              </p>
              <div className="mt-4 space-y-3">
                {context.nearby.map((entry) => {
                  const appearance = resolveIdentityAppearance(
                    {
                      selfName: entry.self_name,
                      visual: entry.visual,
                      config: entry.config,
                      genLevel: entry.gen_level,
                      vitality: entry.vitality,
                    },
                    locale,
                  );
                  const color = entry.visual?.color ?? appearance.palette.primary;
                  return (
                    <div
                      key={`${entry.rank}-${entry.agent_id}`}
                      className={`flex items-center gap-3 rounded-2xl border p-3 ${
                        entry.is_self ? "border-cyan-300/25 bg-cyan-400/10" : "theme-subpanel"
                      }`}
                    >
                      <div className="theme-subpanel flex h-10 w-10 items-center justify-center rounded-xl text-sm font-semibold">
                        #{entry.rank}
                      </div>
                      <IdentityPresence appearance={appearance} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {entry.self_name || t("leaderboard.unnamed")}
                        </p>
                        <p className="theme-text-faint mt-1 text-xs">
                          Gen {entry.gen_level} · {entry.total_messages} {t("leaderboard.conversations")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold" style={{ color }}>
                          {getMetricValue(entry)}
                        </p>
                        <p className="text-[11px] text-white/50">{getMetricLabel()}</p>
                      </div>
                    {!entry.is_self && (
                      <button
                        type="button"
                        disabled={followBusyId === entry.agent_id}
                        onClick={() => void handleFollow(entry.agent_id, !entry.is_following)}
                        className={`rounded-full border px-3 py-1.5 text-xs ${
                          entry.is_following
                            ? "border-white/15 bg-white/5 text-white/72"
                            : "border-cyan-300/25 bg-cyan-400/10 text-cyan-100"
                        } disabled:opacity-50`}
                      >
                        {entry.is_following ? t("social.unfollow") : t("social.follow")}
                      </button>
                    )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {entries.length === 0 ? (
          <AnimatedEmptyState
            icon="social"
            title={t("leaderboard.empty")}
            description={t("leaderboard.emptyDesc")}
            accentColor="#818cf8"
          />
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => {
              const appearance = resolveIdentityAppearance(
                {
                  selfName: entry.self_name,
                  visual: entry.visual,
                  config: entry.config,
                  genLevel: entry.gen_level,
                  vitality: entry.vitality,
                },
                locale,
              );
              const color = entry.visual?.color ?? appearance.palette.primary;
              const isTop3 = i < 3;

              return (
                <div
                  key={`${entry.rank}-${entry.agent_id}`}
                  className={`relative flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
                    entry.is_self
                      ? "border-cyan-300/25 bg-cyan-400/10"
                      : isTop3
                        ? "border-white/15 bg-gradient-to-r from-white/[0.06] to-transparent"
                        : "border-white/8 bg-white/[0.03]"
                  }`}
                  style={isTop3 && !entry.is_self ? { borderColor: `${color}35` } : undefined}
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                      i === 0
                        ? "bg-yellow-400/20 text-yellow-300"
                        : i === 1
                          ? "bg-gray-300/20 text-gray-300"
                          : i === 2
                            ? "bg-orange-400/20 text-orange-300"
                        : "theme-subpanel theme-text-subtle"
                    }`}
                  >
                    {entry.rank}
                  </div>

                  <IdentityPresence appearance={appearance} size="sm" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {entry.self_name || t("leaderboard.unnamed")}
                    </p>
                    <div className="theme-text-subtle mt-1 flex items-center gap-3 text-xs">
                      <span style={{ color }}>Gen {entry.gen_level}</span>
                      <span>·</span>
                      <span>{entry.total_messages} {t("leaderboard.conversations")}</span>
                      <span>·</span>
                      <span>{Math.round(entry.vitality * 100)}%</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-semibold" style={{ color }}>
                      {getMetricValue(entry)}
                    </p>
                    <p className="theme-text-faint text-[11px]">
                      {getMetricLabel()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
