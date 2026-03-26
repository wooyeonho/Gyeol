"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import {
  getActiveSeasonalEvent,
  getEventTimeRemaining,
} from "@/lib/engagement/seasonal-event";

export default function EventsPage() {
  const { locale, t } = useTranslations();
  const localeKey = locale === "en" ? "en" : "ko";

  const activeEvent = useMemo(() => getActiveSeasonalEvent(), []);
  const timeRemaining = useMemo(
    () => (activeEvent ? getEventTimeRemaining(activeEvent) : null),
    [activeEvent],
  );

  return (
    <div className="min-h-screen bg-black px-4 pb-24 pt-20 text-white">
      <div className="mx-auto max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Link href="/" className="text-sm text-white/50 hover:text-white/80">
            &larr; {t("common.back")}
          </Link>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight mb-6">
          {t("events.title")}
        </h1>

        {activeEvent ? (
          <div
            className="rounded-3xl border p-6"
            style={{
              borderColor: `${activeEvent.theme_color}40`,
              background: `${activeEvent.theme_color}08`,
              boxShadow: `0 0 80px ${activeEvent.theme_color}10`,
            }}
          >
            {/* Event header */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">{activeEvent.icon}</span>
              <div>
                <p className="text-lg font-semibold">{activeEvent.label[localeKey]}</p>
                <p className="text-sm text-white/60">{activeEvent.description[localeKey]}</p>
              </div>
            </div>

            {/* Time remaining */}
            {timeRemaining && !timeRemaining.expired && (
              <div
                className="rounded-xl px-4 py-3 mb-4"
                style={{ background: `${activeEvent.theme_color}15` }}
              >
                <p className="text-xs uppercase tracking-wider text-white/50 mb-1">
                  {t("events.timeRemaining")}
                </p>
                <p className="text-lg font-bold" style={{ color: activeEvent.theme_color }}>
                  {timeRemaining.days}d {timeRemaining.hours}h
                </p>
              </div>
            )}

            {/* Reward tiers */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-white/70">{t("events.rewards")}</h3>
              {activeEvent.rewards.map((reward) => (
                <div
                  key={reward.tier}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold"
                    style={{
                      background: `${activeEvent.theme_color}20`,
                      color: activeEvent.theme_color,
                    }}
                  >
                    {reward.tier}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{reward.label[localeKey]}</p>
                    <p className="text-xs text-white/50">
                      {reward.requirement.type}: {reward.requirement.value}
                    </p>
                  </div>
                  <div className="text-right text-xs text-white/60">
                    {reward.reward.coins && <span>{reward.reward.coins} coins</span>}
                    {reward.reward.evolution_points && (
                      <span className="ml-2">+{reward.reward.evolution_points} EP</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Community goal */}
            {activeEvent.community_goal && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <h3 className="text-xs uppercase tracking-wider text-white/50 mb-2">
                  {t("events.communityGoal")}
                </h3>
                <p className="text-sm text-white/70 mb-3">
                  {activeEvent.community_goal.description[localeKey]}
                </p>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (activeEvent.community_goal.current / activeEvent.community_goal.target) * 100)}%`,
                      background: activeEvent.theme_color,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-white/40 text-right">
                  {activeEvent.community_goal.current.toLocaleString()} / {activeEvent.community_goal.target.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-3xl mb-3">🌙</p>
            <p className="text-sm text-white/60">{t("events.noActiveEvent")}</p>
            <p className="mt-2 text-xs text-white/40">{t("events.checkBackLater")}</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
