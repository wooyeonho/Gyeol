"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";

interface WorldEvent {
  id: string;
  type: string;
  name: string;
  description: string;
  startsAt: string;
  endsAt: string;
  dnaEffects: Array<{ axis: string; delta: number }>;
  active: boolean;
}

const EVENT_EMOJIS: Record<string, string> = {
  meteor: "☄️",
  eclipse: "🌑",
  full_moon: "🌕",
  aurora: "🌌",
  season_change: "🍂",
  cosmic_storm: "⚡",
};

const EVENT_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  meteor: { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-300" },
  eclipse: { border: "border-slate-400/30", bg: "bg-slate-400/10", text: "text-slate-300" },
  full_moon: { border: "border-amber-400/30", bg: "bg-amber-400/10", text: "text-amber-300" },
  aurora: { border: "border-emerald-400/30", bg: "bg-emerald-400/10", text: "text-emerald-300" },
  season_change: { border: "border-yellow-500/30", bg: "bg-yellow-500/10", text: "text-yellow-300" },
  cosmic_storm: { border: "border-purple-400/30", bg: "bg-purple-400/10", text: "text-purple-300" },
};

function TimeRemaining({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("종료됨"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [endsAt]);

  return <span className="text-xs text-white/50">{remaining}</span>;
}

export default function WorldEventsPage() {
  const { t } = useTranslations();
  const [events, setEvents] = useState<WorldEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/world-events");
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const activeEvents = events.filter((e) => e.active);
  const pastEvents = events.filter((e) => !e.active);

  return (
    <div className="min-h-screen bg-background px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-indigo-300">
            {t("worldEvents.eyebrow") || "World Events"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {t("worldEvents.title") || "세계 이벤트"}
          </h1>
          <p className="mt-1 text-sm text-white/50">
            {t("worldEvents.subtitle") || "모든 생명체가 동시에 경험하는 우주적 순간"}
          </p>
        </header>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-indigo-400" />
          </div>
        ) : (
          <>
            {/* Active events */}
            {activeEvents.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-white/70">
                  {t("worldEvents.activeNow") || "진행 중인 이벤트"}
                </h3>
                {activeEvents.map((event, i) => {
                  const colors = EVENT_COLORS[event.type] ?? EVENT_COLORS.meteor;
                  return (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={`rounded-[2rem] border ${colors.border} ${colors.bg} p-6`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-4xl">{EVENT_EMOJIS[event.type] ?? "🌟"}</span>
                        <div className="flex-1">
                          <h3 className={`text-lg font-semibold ${colors.text}`}>
                            {event.name}
                          </h3>
                          <TimeRemaining endsAt={event.endsAt} />
                        </div>
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300">
                          {t("worldEvents.live") || "LIVE"}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-white/60 leading-relaxed">
                        {event.description}
                      </p>

                      {/* DNA mutation effects */}
                      {event.dnaEffects.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {event.dnaEffects.map((effect) => (
                            <span
                              key={effect.axis}
                              className={`rounded-full px-2.5 py-1 text-xs ${
                                effect.delta > 0
                                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20"
                                  : "bg-red-500/15 text-red-300 border border-red-500/20"
                              }`}
                            >
                              {effect.axis} {effect.delta > 0 ? "+" : ""}{(effect.delta * 100).toFixed(0)}%
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card rounded-[2rem] p-8 text-center">
                <span className="text-4xl">🌙</span>
                <p className="mt-3 text-sm text-white/50">
                  {t("worldEvents.noActive") || "현재 진행 중인 이벤트가 없습니다"}
                </p>
                <p className="mt-1 text-xs text-white/30">
                  {t("worldEvents.checkBack") || "곧 새로운 우주적 순간이 찾아올 거예요"}
                </p>
              </div>
            )}

            {/* Past events */}
            {pastEvents.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white/70">
                  {t("worldEvents.past") || "지난 이벤트"}
                </h3>
                {pastEvents.slice(0, 10).map((event) => {
                  const colors = EVENT_COLORS[event.type] ?? EVENT_COLORS.meteor;
                  return (
                    <div
                      key={event.id}
                      className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 opacity-60"
                    >
                      <span className="text-xl">{EVENT_EMOJIS[event.type] ?? "🌟"}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${colors.text}`}>{event.name}</p>
                        <p className="text-xs text-white/25">
                          {new Date(event.startsAt).toLocaleDateString()} — {new Date(event.endsAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
