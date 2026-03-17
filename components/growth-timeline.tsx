"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

type GrowthEvent = {
  id: string;
  type: string;
  summary: string;
  created_at: string;
};

type DreamEntry = {
  id: string;
  content: string;
  created_at: string;
};

type ArtifactEntry = {
  id: string;
  type: string;
  title: string;
  content: string;
  created_at: string;
};

type TimelineItem = {
  id: string;
  category: "growth" | "dream" | "artifact";
  type: string;
  title: string;
  detail: string;
  created_at: string;
};

function getCategoryColor(category: string): string {
  switch (category) {
    case "growth":
      return "border-amber-500/40 bg-amber-500/10";
    case "dream":
      return "border-purple-500/40 bg-purple-500/10";
    case "artifact":
      return "border-blue-500/40 bg-blue-500/10";
    default:
      return "border-white/20 bg-white/5";
  }
}

function getCategoryDot(category: string): string {
  switch (category) {
    case "growth":
      return "bg-amber-400";
    case "dream":
      return "bg-purple-400";
    case "artifact":
      return "bg-blue-400";
    default:
      return "bg-white/60";
  }
}

function getTypeLabel(type: string, t: (key: string) => string): string {
  switch (type) {
    case "evolution":
      return t("livingFeed.evolutionLabel");
    case "self_naming":
      return t("livingFeed.namingLabel");
    case "personality_evolution":
      return t("livingFeed.personalityLabel");
    case "social_encounter":
      return t("livingFeed.socialLabel");
    case "research_task_completed":
      return t("livingFeed.researchLabel");
    case "dream_journal":
      return t("livingFeed.dreamLabel");
    case "perspective_journal":
      return t("growthTimeline.perspectiveLabel");
    default:
      return t("livingFeed.activityLabel");
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GrowthTimeline() {
  const { t } = useTranslations();
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/welcome-back", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();

        const timeline: TimelineItem[] = [];

        if (Array.isArray(data.growth_events)) {
          for (const e of data.growth_events as GrowthEvent[]) {
            timeline.push({
              id: e.id,
              category: "growth",
              type: e.type,
              title: getTypeLabel(e.type, t),
              detail: e.summary,
              created_at: e.created_at,
            });
          }
        }

        if (Array.isArray(data.dreams)) {
          for (const d of data.dreams as DreamEntry[]) {
            timeline.push({
              id: d.id,
              category: "dream",
              type: "dream_journal",
              title: t("livingFeed.dreamLabel"),
              detail: d.content,
              created_at: d.created_at,
            });
          }
        }

        if (Array.isArray(data.artifacts)) {
          for (const a of data.artifacts as ArtifactEntry[]) {
            timeline.push({
              id: a.id,
              category: "artifact",
              type: a.type,
              title: a.title || t("livingFeed.artifactLabel"),
              detail: a.content,
              created_at: a.created_at,
            });
          }
        }

        timeline.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );

        if (!cancelled) setItems(timeline);
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
  }, [t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/40" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <p className="text-sm text-white/50">{t("growthTimeline.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <h3 className="mb-3 text-sm font-medium uppercase tracking-wider text-white/60">
        {t("growthTimeline.title")}
      </h3>
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-3 top-2 bottom-2 w-px bg-white/10" />

        <div className="space-y-3">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="relative pl-8"
            >
              {/* Timeline dot */}
              <div
                className={`absolute left-2 top-3 h-2.5 w-2.5 rounded-full ${getCategoryDot(item.category)} ring-2 ring-black`}
              />

              <button
                type="button"
                onClick={() =>
                  setExpandedId(expandedId === item.id ? null : item.id)
                }
                className={`w-full rounded-xl border p-3 text-left transition-all hover:bg-white/[0.03] ${getCategoryColor(item.category)}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-white/80">
                    {item.title}
                  </span>
                  <span className="flex-shrink-0 text-xs text-white/40">
                    {formatDate(item.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-white/70 line-clamp-2">
                  {item.detail.slice(0, 150)}
                  {item.detail.length > 150 ? "..." : ""}
                </p>
              </button>

              <AnimatePresence>
                {expandedId === item.id && item.detail.length > 150 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 rounded-lg bg-white/[0.03] p-3">
                      <p className="text-sm leading-relaxed text-white/65 whitespace-pre-wrap">
                        {item.detail}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
