"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";

const SOURCE_ICONS: Record<string, string> = {
  rss: "\u{1F4E1}",
  crawl: "\u{1F310}",
  conversation: "\u{1F4AC}",
  social: "\u{1F91D}",
  dream: "\u{1F319}",
  self: "\u{1F4AD}",
  shared: "\u{1F4DA}",
};

type MoltBookEntry = {
  id: string;
  topic: string;
  summary: string;
  source_type: string;
  confidence: number;
  tags: string[];
  times_referenced: number;
  is_public: boolean;
  created_at: string;
};

export default function MoltBookPage() {
  const { t } = useTranslations();
  const [entries, setEntries] = useState<MoltBookEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/moltbook");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setEntries(data.entries ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="theme-page min-h-screen px-4 pb-24 pt-20">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="theme-panel rounded-[2rem] p-6">
          <h1 className="text-2xl font-semibold tracking-tight">{t("moltbook.title")}</h1>
          <p className="theme-text-subtle mt-2 text-sm">{t("moltbook.description")}</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs theme-text-faint">
              {t("moltbook.entryCount").replace("{count}", String(entries.length))}
            </span>
            <Link
              href="/molthub"
              className="ml-auto rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/70 hover:bg-white/15 transition-colors"
            >
              {t("molthub.title")} &rarr;
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="theme-panel animate-pulse rounded-2xl p-4 h-24" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-8 text-center"
          >
            <p className="text-sm text-white/50">{t("moltbook.empty")}</p>
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
                    <span className="text-lg" role="img" aria-label={entry.source_type}>
                      {SOURCE_ICONS[entry.source_type] ?? SOURCE_ICONS.self}
                    </span>
                    <h3 className="text-sm font-semibold text-white">{entry.topic}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.is_public && (
                      <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
                        {t("moltbook.shared")}
                      </span>
                    )}
                    <span className="text-[10px] theme-text-faint">
                      {t("moltbook.confidence")}: {Math.round(entry.confidence * 100)}%
                    </span>
                  </div>
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
                {entry.times_referenced > 0 && (
                  <p className="mt-1 text-[10px] theme-text-faint">
                    Referenced {entry.times_referenced}x
                  </p>
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
