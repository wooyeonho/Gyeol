"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { AnimatedEmptyState } from "@/components/ui/animated-empty-state";
import { PageShell, itemVariants } from "@/components/discover/page-shell";
import { PageSkeleton } from "@/components/discover/skeleton";
import { ErrorBanner } from "@/components/discover/error-banner";
import { ShareSnapshotButton } from "@/components/share-snapshot-button";

type Dream = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  is_preserved: boolean;
};

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale === "ko" ? "ko-KR" : undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type DreamBucket = "today" | "this_week" | "this_month" | "older";

function bucketForDream(iso: string, now: number): DreamBucket {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "older";
  const ageMs = now - ts;
  const day = 86400000;
  if (ageMs < day) return "today";
  if (ageMs < 7 * day) return "this_week";
  if (ageMs < 30 * day) return "this_month";
  return "older";
}

const BUCKET_ORDER: DreamBucket[] = ["today", "this_week", "this_month", "older"];

export default function DreamsPage() {
  const { locale, t } = useTranslations();
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/dreams")
      .then((res) => {
        if (!res.ok) throw new Error("fetch");
        return res.json();
      })
      .then((json) => {
        setDreams(Array.isArray(json.dreams) ? json.dreams : []);
      })
      .catch(() => {
        setError(t("dreams.loadError"));
        setDreams([]);
      })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  // Group dreams by recency so a long list stays scannable. The bucketing is
  // computed once per render against a stable "now" so a dream doesn't drift
  // into a different bucket while the page is mounted.
  const grouped = useMemo(() => {
    const now = Date.now();
    const map = new Map<DreamBucket, Dream[]>();
    for (const dream of dreams) {
      const bucket = bucketForDream(dream.created_at, now);
      const arr = map.get(bucket) ?? [];
      arr.push(dream);
      map.set(bucket, arr);
    }
    return BUCKET_ORDER
      .map((bucket) => ({ bucket, dreams: map.get(bucket) ?? [] }))
      .filter((g) => g.dreams.length > 0);
  }, [dreams]);

  async function togglePreserved(id: string, current: boolean) {
    const next = !current;
    // Optimistic update first — preserve is non-destructive, so even on
    // failure the worst outcome is a stale heart icon until the next fetch.
    setDreams((prev) =>
      prev.map((d) => (d.id === id ? { ...d, is_preserved: next } : d)),
    );
    try {
      const res = await fetch(`/api/artifacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_preserved: next }),
      });
      if (!res.ok) throw new Error("patch");
    } catch {
      setDreams((prev) =>
        prev.map((d) => (d.id === id ? { ...d, is_preserved: current } : d)),
      );
    }
  }

  if (loading) return <PageSkeleton rows={3} />;

  return (
    <PageShell>
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-3 pb-2">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-white/60">
            {t("dreams.eyebrow")}
          </p>
          <h1 className="text-2xl font-semibold text-white">{t("dreams.title")}</h1>
          <p className="text-sm text-white/60">{t("dreams.subtitle")}</p>
        </div>
        {dreams.length > 0 && (
          <div className="flex-shrink-0 pt-1">
            <ShareSnapshotButton />
          </div>
        )}
      </motion.div>

      {error && (
        <motion.div variants={itemVariants}>
          <ErrorBanner message={error} onRetry={load} />
        </motion.div>
      )}

      {!error && dreams.length === 0 && (
        <motion.div variants={itemVariants}>
          <AnimatedEmptyState
            icon="activity"
            title={t("dreams.empty")}
            description={t("dreams.emptyDesc")}
            accentColor="#a78bfa"
          />
        </motion.div>
      )}

      {grouped.map(({ bucket, dreams: bucketDreams }) => (
        <motion.div
          key={bucket}
          variants={itemVariants}
          className="space-y-3"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-white/45">
            {t(`dreams.bucket_${bucket}`)}
          </p>
          {bucketDreams.map((dream) => {
          const isOpen = expanded === dream.id;
          return (
            <motion.article
              key={dream.id}
              layout
              className="overflow-hidden rounded-2xl border border-purple-500/20 bg-purple-500/[0.05]"
            >
              <div className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white/50">
                    {formatDate(dream.created_at, locale)}
                  </p>
                  {dream.title && (
                    <p className="mt-0.5 text-sm font-medium text-white/85">
                      {dream.title}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void togglePreserved(dream.id, dream.is_preserved)}
                  aria-pressed={dream.is_preserved}
                  className={`flex-shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors active:scale-[0.97] ${
                    dream.is_preserved
                      ? "border-purple-400/50 bg-purple-500/20 text-purple-100"
                      : "border-white/15 bg-white/[0.06] text-white/70 hover:bg-white/[0.12]"
                  }`}
                >
                  {dream.is_preserved ? t("dreams.preserved") : t("dreams.preserve")}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : dream.id)}
                aria-expanded={isOpen}
                className="block w-full px-4 pb-3 text-left"
              >
                <p
                  className={`text-sm leading-relaxed text-white/80 italic ${
                    isOpen ? "" : "line-clamp-3"
                  }`}
                >
                  {dream.content}
                </p>
                <AnimatePresence>
                  {dream.content.length > 200 && (
                    <motion.span
                      key={isOpen ? "collapse" : "expand"}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="mt-1 inline-block text-xs text-purple-300/80"
                    >
                      {isOpen ? t("dreams.collapse") : t("dreams.readMore")}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </motion.article>
          );
        })}
        </motion.div>
      ))}
    </PageShell>
  );
}
