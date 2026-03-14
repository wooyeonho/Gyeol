"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { IdentityPresence } from "@/components/identity-presence";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";
import { AnimatedEmptyState } from "@/components/ui/animated-empty-state";
import type { LeaderboardEntry, LeaderboardResponse } from "@/app/api/leaderboard/route";

type Tab = "level" | "messages" | "vitality";

export default function LeaderboardPage() {
  const { locale, t } = useTranslations();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("level");

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

  const tabs: { key: Tab; label: string }[] = [
    { key: "level", label: t("leaderboard.tabLevel") },
    { key: "messages", label: t("leaderboard.tabMessages") },
    { key: "vitality", label: t("leaderboard.tabVitality") },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-lg">
        <header className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/70">
            {t("leaderboard.eyebrow")}
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {t("leaderboard.title")}
          </h1>
          <p className="mt-2 text-sm text-white/55">
            {t("leaderboard.subtitle")}
          </p>
          {data && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs text-white/60">
                {t("leaderboard.totalAgents").replace("{count}", String(data.totalAgents))}
              </span>
            </div>
          )}
        </header>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-400/30 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-5 flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-cyan-500/20 border border-cyan-400/30 text-cyan-200"
                  : "bg-white/5 border border-white/10 text-white/55 hover:text-white/75"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Entries */}
        {entries.length === 0 ? (
          <AnimatedEmptyState
            icon="social"
            title={t("leaderboard.empty")}
            description={
              locale === "en"
                ? "No agents found yet. Start growing your Gyeol!"
                : "아직 결이 없습니다. 첫 대화를 시작해보세요!"
            }
            accentColor="#22d3ee"
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
                locale
              );
              const color = entry.visual?.color ?? appearance.palette.primary;
              const isTop3 = i < 3;

              return (
                <div
                  key={`${entry.rank}-${entry.self_name}`}
                  className={`relative flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
                    isTop3
                      ? "border-white/15 bg-gradient-to-r from-white/[0.06] to-transparent"
                      : "border-white/8 bg-white/[0.03]"
                  }`}
                  style={isTop3 ? { borderColor: `${color}35` } : undefined}
                >
                  {/* Rank badge */}
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                      i === 0
                        ? "bg-yellow-400/20 text-yellow-300"
                        : i === 1
                          ? "bg-gray-300/20 text-gray-300"
                          : i === 2
                            ? "bg-orange-400/20 text-orange-300"
                            : "bg-white/5 text-white/40"
                    }`}
                  >
                    {entry.rank}
                  </div>

                  <IdentityPresence appearance={appearance} size="sm" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {entry.self_name || (locale === "ko" ? "이름 없음" : "Unnamed")}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-white/50">
                      <span style={{ color }}>Gen {entry.gen_level}</span>
                      <span>·</span>
                      <span>{entry.total_messages} {locale === "ko" ? "대화" : "msgs"}</span>
                      <span>·</span>
                      <span>{Math.round(entry.vitality * 100)}%</span>
                    </div>
                  </div>

                  {/* Highlight stat for active tab */}
                  <div className="text-right">
                    <p className="text-lg font-semibold" style={{ color }}>
                      {tab === "level"
                        ? entry.gen_level
                        : tab === "messages"
                          ? entry.total_messages
                          : `${Math.round(entry.vitality * 100)}%`}
                    </p>
                    <p className="text-[11px] text-white/40">
                      {tab === "level"
                        ? "Gen"
                        : tab === "messages"
                          ? locale === "ko" ? "대화" : "msgs"
                          : locale === "ko" ? "활력" : "vitality"}
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
