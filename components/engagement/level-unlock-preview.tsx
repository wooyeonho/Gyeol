"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";
import { getNextUnlocks } from "@/lib/engagement/level-unlocks";

/**
 * Phase 1-2: "Coming up at level X" card.
 *
 * Reads the user's current level straight from the engagement slot of
 * the Zustand store so it stays in sync with the level bar. If no
 * engagement data is loaded yet (fresh session) we render nothing so
 * there is no placeholder flicker.
 */
export function LevelUnlockPreview() {
  const engagement = useAgentStore((s) => s.engagement);
  if (!engagement) return null;

  const level = engagement.level ?? 1;
  const upcoming = getNextUnlocks(level, 3);
  if (upcoming.length === 0) return null;

  return (
    <motion.section
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
          곧 열리는 기능
        </p>
        <span className="text-[10px] text-white/30">Lv. {level}</span>
      </div>
      <div className="space-y-2">
        {upcoming.map((unlock) => {
          const delta = unlock.level - level;
          const inner = (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.06] text-lg">
                {unlock.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white/85">
                  {unlock.title}
                </p>
                <p className="truncate text-[11px] text-white/40">
                  {unlock.description}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-amber-300/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                Lv. {unlock.level}
                {delta > 0 ? ` · +${delta}` : ""}
              </span>
            </>
          );
          const rowClass =
            "flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 transition-colors hover:bg-white/[0.05]";
          return unlock.href ? (
            <Link key={unlock.level} href={unlock.href} className={rowClass}>
              {inner}
            </Link>
          ) : (
            <div key={unlock.level} className={rowClass}>
              {inner}
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}
