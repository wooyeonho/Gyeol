"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

type Activity = {
  id: string;
  type: string;
  summary: string;
  created_at: string;
};

type Dream = {
  id: string;
  content: string;
  created_at: string;
};

type Artifact = {
  id: string;
  type: string;
  title: string;
  content: string;
  created_at: string;
  expires_at: string | null;
};

type GrowthEvent = {
  id: string;
  type: string;
  summary: string;
  created_at: string;
};

type WelcomeData = {
  has_activity: boolean;
  hours_away: number;
  activities: Activity[];
  dreams: Dream[];
  artifacts: Artifact[];
  mood_shift: { previous: string | null; current: string | null } | null;
  vitality: number;
  greeting: string | null;
  growth_events: GrowthEvent[];
};

function getActivityIcon(type: string): string {
  switch (type) {
    case "heartbeat":
    case "soliloquy":
      return "\u2764";
    case "dream":
      return "\u2601";
    case "social_encounter":
      return "\u2728";
    case "research_task_completed":
      return "\u{1F50D}";
    case "evolution":
      return "\u2B06";
    case "self_naming":
      return "\u{1F3F7}";
    case "personality_evolution":
      return "\u{1F331}";
    case "web_crawl":
      return "\u{1F310}";
    case "artifact_creation":
      return "\u{1F3A8}";
    default:
      return "\u25CF";
  }
}

function getActivityLabel(type: string, t: (key: string) => string): string {
  switch (type) {
    case "heartbeat":
    case "soliloquy":
      return t("livingFeed.thoughtLabel");
    case "dream":
      return t("livingFeed.dreamLabel");
    case "social_encounter":
      return t("livingFeed.socialLabel");
    case "research_task_completed":
      return t("livingFeed.researchLabel");
    case "evolution":
      return t("livingFeed.evolutionLabel");
    case "self_naming":
      return t("livingFeed.namingLabel");
    case "personality_evolution":
      return t("livingFeed.personalityLabel");
    case "web_crawl":
      return t("livingFeed.crawlLabel");
    case "artifact_creation":
      return t("livingFeed.artifactLabel");
    default:
      return t("livingFeed.activityLabel");
  }
}

function formatTimeAgo(dateStr: string, t: (key: string) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t("livingFeed.justNow");
  if (minutes < 60) return t("livingFeed.minutesAgo").replace("{n}", String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("livingFeed.hoursAgo").replace("{n}", String(hours));
  const days = Math.floor(hours / 24);
  return t("livingFeed.daysAgo").replace("{n}", String(days));
}

export function LivingFeed({
  onGreetingReady,
}: {
  onGreetingReady?: (greeting: string) => void;
}) {
  const { t } = useTranslations();
  const [data, setData] = useState<WelcomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [expandedDream, setExpandedDream] = useState<string | null>(null);

  // Stabilize callback ref to prevent re-fetching when parent re-renders with new callback identity
  const onGreetingReadyRef = useRef(onGreetingReady);
  useEffect(() => { onGreetingReadyRef.current = onGreetingReady; }, [onGreetingReady]);
  const greetingFiredRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/welcome-back", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as WelcomeData;
        if (!cancelled) {
          setData(json);
          if (json.greeting && onGreetingReadyRef.current) {
            onGreetingReadyRef.current(json.greeting);
          }
        }
      } catch {
        // Silent fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // First visit — no activity yet → inject birth greeting into chat
  useEffect(() => {
    if (!loading && data && !data.has_activity && onGreetingReadyRef.current && !greetingFiredRef.current) {
      greetingFiredRef.current = true;
      onGreetingReadyRef.current(t("livingFeed.birthGreeting"));
    }
  }, [loading, data, t]);

  if (loading || !data || !data.has_activity) {
    return null;
  }

  const allItems = [
    ...data.growth_events.map((e) => ({ ...e, category: "growth" as const })),
    ...data.dreams.map((d) => ({
      id: d.id,
      type: "dream",
      summary: d.content.slice(0, 120),
      created_at: d.created_at,
      category: "dream" as const,
      fullContent: d.content,
    })),
    ...data.artifacts.map((a) => ({
      id: a.id,
      type: "artifact_creation",
      summary: a.title || a.content.slice(0, 120),
      created_at: a.created_at,
      category: "artifact" as const,
    })),
    ...data.activities
      .filter(
        (a) =>
          !data.growth_events.some((g) => g.id === a.id) &&
          a.type !== "heartbeat_soliloquy",
      )
      .map((a) => ({ ...a, category: "activity" as const })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  if (allItems.length === 0) return null;

  return (
    <AnimatePresence>
      {!dismissed && (
      <motion.div
        key="living-feed"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-auto mx-auto w-full max-w-[720px] px-2"
      >
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: "var(--creature-primary, #22d3ee)" }} />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "var(--creature-primary, #22d3ee)" }} />
              </span>
              <p className="text-xs font-medium uppercase tracking-wider text-white/70">
                {t("livingFeed.whileAway")}
              </p>
              {data.hours_away >= 1 ? (
                <span className="text-xs text-white/40">
                  {t("livingFeed.hoursAway").replace("{n}", String(Math.round(data.hours_away)))}
                </span>
              ) : data.hours_away > 0 ? (
                <span className="text-xs text-white/40">
                  {t("livingFeed.minutesAgo").replace("{n}", String(Math.max(1, Math.round(data.hours_away * 60))))}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg px-2 py-1 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
            >
              {t("common.close")}
            </button>
          </div>

          {/* Activity timeline */}
          <div className="max-h-[280px] overflow-y-auto px-4 py-3">
            <div className="space-y-2.5">
              {allItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06, duration: 0.3 }}
                  className="group flex gap-3"
                >
                  {/* Timeline dot + line */}
                  <div className="flex flex-col items-center pt-1">
                    <span className="text-sm leading-none">
                      {getActivityIcon(item.type)}
                    </span>
                    {index < allItems.length - 1 && (
                      <div className="mt-1 flex-1 w-px bg-white/10" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1 pb-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-white/60">
                        {getActivityLabel(item.type, t)}
                      </span>
                      <span className="text-xs text-white/30">
                        {formatTimeAgo(item.created_at, t)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm leading-relaxed text-white/85">
                      {item.summary}
                    </p>
                    {"fullContent" in item && item.fullContent && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDream(
                            expandedDream === item.id ? null : item.id,
                          )
                        }
                        className="mt-1 text-xs transition-colors hover:opacity-100 opacity-70"
                        style={{ color: "var(--creature-primary, #22d3ee)" }}
                      >
                        {expandedDream === item.id
                          ? t("livingFeed.collapse")
                          : t("livingFeed.readMore")}
                      </button>
                    )}
                    <AnimatePresence>
                      {"fullContent" in item &&
                        expandedDream === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="mt-2 rounded-lg bg-white/5 p-3 text-sm leading-relaxed text-white/70 italic">
                              {item.fullContent}
                            </p>
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer with vitality */}
          {data.mood_shift?.current && (
            <div className="border-t border-white/8 px-4 py-2.5">
              <div className="flex items-center gap-3 text-xs text-white/50">
                <span>
                  {t("livingFeed.currentMood")}: {data.mood_shift.current}
                </span>
                <span className="h-1 w-1 rounded-full bg-white/20" />
                <span>
                  {t("livingFeed.vitality")}: {Math.round(data.vitality * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
