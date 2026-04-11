"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import type { SpeciesCommunityEntry } from "@/app/api/community/species/route";

/**
 * Phase 3-2: Species community index.
 *
 * Each species gets its own automatic community surface listing how
 * many creatures share it, the newest-named member, and an average
 * gen level. Clicking into the card deep-links to /discover filtered
 * for the species. This is intentionally read-only — actual group
 * chat / challenges can slot in later, the immediate goal is to make
 * Phase 3-2 visible to users.
 */
export default function SpeciesCommunityPage() {
  const [entries, setEntries] = useState<SpeciesCommunityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/community/species", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled && json?.entries) {
          setEntries(json.entries as SpeciesCommunityEntry[]);
        }
      })
      .catch(() => {
        /* non-fatal */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-black px-4 pt-16 pb-28 text-white">
      <div className="mx-auto max-w-lg space-y-4">
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-emerald-300">
            Species
          </p>
          <h1 className="mt-1 text-2xl font-semibold">종족 커뮤니티</h1>
          <p className="mt-1 text-sm text-white/50">
            같은 종족끼리 모이는 자동 생성 그룹
          </p>
        </header>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-white/[0.03]" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="py-12 text-center text-sm text-white/30">
            아직 모인 생명체가 부족해요. 친구를 초대해 볼까요?
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const avgLevel = entry.member_count
                ? Math.round((entry.total_level / entry.member_count) * 10) / 10
                : 0;
              return (
                <motion.div
                  key={entry.species}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Link
                    href={`/discover?species=${encodeURIComponent(entry.species)}`}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-2xl">
                      {entry.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {entry.species}
                      </p>
                      <p className="truncate text-[11px] text-white/40">
                        {entry.member_count.toLocaleString()}명 · 평균 Lv.{avgLevel}
                        {entry.newest_name && ` · 새 친구 “${entry.newest_name}”`}
                      </p>
                    </div>
                    <span className="shrink-0 text-white/30">→</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </main>
  );
}
