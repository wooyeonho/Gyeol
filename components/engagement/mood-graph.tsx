"use client";

import { motion } from "framer-motion";
import type { MoodDay } from "@/app/api/dashboard/mood-week/route";
import { getMoodEmoji } from "@/lib/diary/creature-diary";

interface MoodGraphProps {
  days: MoodDay[];
}

/**
 * 14-day emotional timeline. Each day is a vertical bar whose height
 * encodes mood valence (-2..+2) and whose color encodes the bucket
 * (positive/neutral/negative). Empty days show a faint placeholder.
 */
export function MoodGraph({ days }: MoodGraphProps) {
  return (
    <div className="space-y-2">
      <div className="flex h-32 items-end gap-1">
        {days.map((day, i) => {
          // -2..2 → 8..100% of the container height.
          const magnitude = Math.min(1, Math.abs(day.score) / 2);
          const heightPct = day.entry_count === 0 ? 6 : 14 + magnitude * 86;

          let barColor = "bg-white/10";
          if (day.bucket === "positive") barColor = "bg-gradient-to-t from-emerald-400/80 to-emerald-200";
          else if (day.bucket === "negative") barColor = "bg-gradient-to-t from-rose-400/80 to-rose-200";
          else if (day.bucket === "neutral" && day.entry_count > 0) barColor = "bg-gradient-to-t from-sky-400/60 to-sky-200";

          return (
            <motion.div
              key={day.date}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ delay: i * 0.025, duration: 0.4, type: "spring", stiffness: 200, damping: 22 }}
              style={{ transformOrigin: "bottom" }}
              className="group relative flex flex-1 flex-col items-center"
            >
              <div className="relative w-full flex h-full items-end">
                <div
                  className={`w-full rounded-t-md ${barColor} shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]`}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="mt-1 text-[9px] text-white/30">
                {day.entry_count > 0 && day.dominant_mood ? getMoodEmoji(day.dominant_mood) : "·"}
              </span>

              {/* Tooltip on hover */}
              {day.entry_count > 0 && day.sample_summary && (
                <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden w-44 -translate-x-1/2 rounded-lg border border-white/10 bg-black/90 p-2 text-[10px] text-white/70 shadow-xl group-hover:block">
                  <div className="mb-1 text-white/50">{day.date}</div>
                  <div className="line-clamp-3 text-white/85">{day.sample_summary}</div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[9px] text-white/25">
        <span>
          {days[0]?.date.slice(5).replace("-", "/")}
        </span>
        <span>
          {days[days.length - 1]?.date.slice(5).replace("-", "/")}
        </span>
      </div>
    </div>
  );
}
