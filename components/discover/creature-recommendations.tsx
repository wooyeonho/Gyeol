"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import type {
  DiscoverCreature,
  DiscoverRecommendations,
} from "@/app/api/discover/recommendations/route";

type Section = {
  key: keyof DiscoverRecommendations;
  title: string;
  subtitle: string;
  icon: string;
};

const SECTIONS: Section[] = [
  { key: "popular",  title: "인기 생명체",       subtitle: "가장 많은 대화를 나눈 친구들", icon: "🔥" },
  { key: "newborn",  title: "새로 태어난 생명체", subtitle: "갓 부화한 따끈따끈한 친구들",  icon: "🐣" },
  { key: "similar",  title: "비슷한 DNA",         subtitle: "내 종족과 비슷한 생명체",       icon: "🧬" },
];

/**
 * Phase 3-1: Discover feed recommendation strip.
 *
 * Fetches three bucketed creature lists from /api/discover/recommendations
 * and renders each as a horizontally-scrolling card row. Each card
 * links to the public compare page so the user can immediately dig
 * into another creature's DNA — the "say hi" CTA from the strategy
 * doc. Gracefully hides empty buckets (e.g. "similar" when the user
 * has no agent yet).
 */
export function CreatureRecommendations() {
  const [data, setData] = useState<DiscoverRecommendations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/discover/recommendations", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<DiscoverRecommendations>) : null))
      .then((json) => {
        if (cancelled) return;
        if (json) setData(json);
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

  if (loading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[120px] animate-pulse rounded-2xl bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-5">
      {SECTIONS.map((section) => {
        const rows = data[section.key];
        if (!rows || rows.length === 0) return null;
        return (
          <section key={section.key}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white/85">
                <span>{section.icon}</span>
                {section.title}
              </h3>
              <span className="text-[10px] uppercase tracking-wider text-white/30">
                {section.subtitle}
              </span>
            </div>
            <div className="scrollbar-none flex gap-3 overflow-x-auto pb-2">
              {rows.map((creature, i) => (
                <CreatureCard key={creature.agent_id} creature={creature} index={i} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CreatureCard({
  creature,
  index,
}: {
  creature: DiscoverCreature;
  index: number;
}) {
  // Same 6-colour rotation the rest of Discover uses so the new strip
  // blends in visually with the existing card grid.
  const gradients = [
    "from-cyan-500/30 to-blue-500/10",
    "from-purple-500/30 to-fuchsia-500/10",
    "from-amber-500/30 to-orange-500/10",
    "from-emerald-500/30 to-teal-500/10",
    "from-indigo-500/30 to-violet-500/10",
    "from-rose-500/30 to-pink-500/10",
  ];
  const gradient = gradients[index % gradients.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={`shrink-0 rounded-2xl border border-white/10 bg-gradient-to-br ${gradient} p-4`}
      style={{ width: 170 }}
    >
      <div className="flex items-center justify-between">
        <p className="truncate text-sm font-semibold text-white">{creature.name}</p>
        <span className="rounded-full border border-white/15 bg-black/20 px-1.5 py-0.5 text-[9px] font-medium text-white/70">
          Lv.{creature.gen_level}
        </span>
      </div>
      {creature.species && (
        <p className="mt-0.5 truncate text-[10px] text-white/60">{creature.species}</p>
      )}
      <div className="mt-3 flex items-center justify-between text-[10px] text-white/50">
        <span>💬 {creature.total_messages}</span>
        <span>❤ {Math.round(creature.intimacy * 100) / 100}</span>
      </div>
      <Link
        href={`/compare?to=${creature.agent_id}`}
        className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 text-[11px] font-semibold text-white/85 hover:bg-white/15"
      >
        인사하기
      </Link>
    </motion.div>
  );
}
