"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import {
  getActiveSeasonalEvent,
  getEventTimeRemaining,
} from "@/lib/engagement/seasonal-event";

interface WarEvent {
  id: string;
  side_a: string;
  side_b: string;
  side_a_score: number;
  side_b_score: number;
  ends_at: string;
  status: string;
}

export default function EventsPage() {
  const { locale, t } = useTranslations();
  const localeKey = locale === "en" ? "en" : "ko";

  const activeEvent = useMemo(() => getActiveSeasonalEvent(), []);
  const [warEvent, setWarEvent] = useState<WarEvent | null>(null);

  useEffect(() => {
    fetch("/api/events/war")
      .then((r) => r.json())
      .then((d: WarEvent | null) => { if (d) setWarEvent(d); })
      .catch(() => {});
  }, []);
  const timeRemaining = useMemo(
    () => (activeEvent ? getEventTimeRemaining(activeEvent) : null),
    [activeEvent],
  );

  // Seasonal particle colors: spring=pink, summer=green, autumn=gold, winter=blue
  const seasonalColors: Record<string, { particle: string; glow: string }> = {
    spring: { particle: "#f9a8d4", glow: "rgba(249,168,212,0.15)" },
    summer: { particle: "#6ee7b7", glow: "rgba(110,231,183,0.12)" },
    autumn: { particle: "#fbbf24", glow: "rgba(251,191,36,0.15)" },
    winter: { particle: "#93c5fd", glow: "rgba(147,197,253,0.12)" },
  };
  const season = activeEvent?.id?.includes("spring") ? "spring"
    : activeEvent?.id?.includes("summer") ? "summer"
    : activeEvent?.id?.includes("autumn") || activeEvent?.id?.includes("fall") ? "autumn"
    : activeEvent?.id?.includes("winter") ? "winter"
    : (() => { const m = new Date().getMonth(); return m < 3 ? "winter" : m < 6 ? "spring" : m < 9 ? "summer" : "autumn"; })();
  const colors = seasonalColors[season] ?? seasonalColors.spring;

  return (
    <div className="relative min-h-screen bg-black px-4 pb-24 pt-20 text-white overflow-hidden">
      {/* Seasonal particle overlay */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-60"
            style={{
              width: 4 + (i % 3) * 3,
              height: 4 + (i % 3) * 3,
              background: colors.particle,
              left: `${(i * 37 + 11) % 100}%`,
              top: `${(i * 23 + 7) % 100}%`,
              boxShadow: `0 0 6px ${colors.particle}`,
              animation: `seasonalFloat ${6 + (i % 4) * 2}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
        <style>{`
          @keyframes seasonalFloat {
            0%, 100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.5; }
            25% { transform: translateY(-30px) translateX(10px) scale(1.2); opacity: 0.8; }
            50% { transform: translateY(-15px) translateX(-8px) scale(0.9); opacity: 0.6; }
            75% { transform: translateY(-40px) translateX(5px) scale(1.1); opacity: 0.7; }
          }
        `}</style>
      </div>
      <div className="relative z-10 mx-auto max-w-lg">
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
                  className="flex items-center gap-3 glass-card rounded-xl px-4 py-3"
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

                {/* War Event (from API) */}
                {warEvent && (
                  <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.05] p-4">
                    <h3 className="text-xs uppercase tracking-wider text-rose-400/70 mb-2">⚔️ War Event</h3>
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <p className="text-sm font-semibold text-white">{warEvent.side_a}</p>
                        <p className="text-lg font-bold text-rose-400">{warEvent.side_a_score}</p>
                      </div>
                      <span className="text-white/30 text-xs">VS</span>
                      <div className="text-center flex-1">
                        <p className="text-sm font-semibold text-white">{warEvent.side_b}</p>
                        <p className="text-lg font-bold text-cyan-400">{warEvent.side_b_score}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/30 mt-2 text-center">
                      {new Date(warEvent.ends_at).toLocaleDateString(locale)}
                    </p>
                  </div>
                )}

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
