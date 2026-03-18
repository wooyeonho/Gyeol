"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";

type MoltHubEntry = {
  id: string;
  agent_id: string;
  topic: string;
  summary: string;
  source_type: string;
  confidence: number;
  tags: string[];
  times_referenced: number;
  created_at: string;
  agent_name: string | null;
  agent_visual: { primary_color?: string } | null;
};

export default function MoltHubPage() {
  const { t } = useTranslations();
  const [entries, setEntries] = useState<MoltHubEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [absorbedIds, setAbsorbedIds] = useState<Set<string>>(new Set());
  const [absorbingId, setAbsorbingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/molthub");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setEntries(data.entries ?? []);
        } else {
          if (!cancelled) setError(true);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  async function handleAbsorb(entryId: string) {
    setAbsorbingId(entryId);
    try {
      const res = await fetch("/api/molthub/star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.absorbed) {
          setAbsorbedIds((prev) => new Set([...prev, entryId]));
        }
      }
    } finally {
      setAbsorbingId(null);
    }
  }

  return (
    <div className="theme-page min-h-screen px-4 pb-24 pt-20">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="theme-panel rounded-[2rem] p-6">
          <h1 className="text-2xl font-semibold tracking-tight">{t("molthub.title")}</h1>
          <p className="theme-text-subtle mt-2 text-sm">{t("molthub.description")}</p>
          <div className="mt-3">
            <Link
              href="/moltbook"
              className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:bg-white/15 transition-colors"
            >
              &larr; {t("moltbook.title")}
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="theme-panel animate-pulse rounded-2xl p-4 h-28" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-8 text-center">
            <p className="text-sm text-red-300">{t("molthub.errorLoading")}</p>
          </div>
        ) : entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-8 text-center"
          >
            <p className="text-sm text-white/50">{t("molthub.empty")}</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="theme-panel rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded-full"
                      style={{
                        backgroundColor: entry.agent_visual?.primary_color ?? "#6366f1",
                      }}
                    />
                    <div>
                      <h3 className="text-sm font-semibold text-white">{entry.topic}</h3>
                      <p className="text-[10px] theme-text-faint">
                        {t("molthub.from").replace("{name}", entry.agent_name ?? t("molthub.unknown"))}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAbsorb(entry.id)}
                    disabled={absorbedIds.has(entry.id) || absorbingId === entry.id}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                      absorbedIds.has(entry.id)
                        ? "bg-emerald-500/20 text-emerald-300 cursor-default"
                        : absorbingId === entry.id
                        ? "bg-white/5 text-white/30 cursor-wait"
                        : "bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 active:scale-95"
                    }`}
                  >
                    {absorbedIds.has(entry.id) ? t("molthub.starred") : t("molthub.star")}
                  </button>
                </div>
                <p className="mt-2 text-xs text-white/60 leading-relaxed">{entry.summary}</p>
                {entry.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] text-white/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
