"use client";

import { motion } from "framer-motion";

interface StatusStat {
  key: "energy" | "happiness" | "hunger";
  icon: string;
  label: { ko: string; en: string };
  value: number; // 0-100
  color: string;
  warnBelow: number;
}

interface CreatureStatusBarProps {
  energy: number;       // 0-100
  happiness: number;    // 0-100
  hunger: number;       // 0-100 (100 = full, 0 = starving)
  locale?: string;
  compact?: boolean;
}

const STATS: StatusStat[] = [
  { key: "energy",    icon: "⚡", label: { ko: "에너지",  en: "Energy"    }, value: 0, color: "bg-cyan-400",   warnBelow: 20 },
  { key: "happiness", icon: "💛", label: { ko: "행복",    en: "Happiness" }, value: 0, color: "bg-yellow-400", warnBelow: 25 },
  { key: "hunger",    icon: "🍚", label: { ko: "포만감",  en: "Hunger"    }, value: 0, color: "bg-green-400",  warnBelow: 20 },
];

function StatBar({ stat, locale }: { stat: StatusStat & { value: number }; locale: string }) {
  const isKo = locale === "ko";
  const isLow = stat.value <= stat.warnBelow;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm w-4 text-center" aria-hidden="true">{stat.icon}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] text-white/50">{stat.label[isKo ? "ko" : "en"]}</span>
          <span className={`text-[10px] font-medium tabular-nums ${isLow ? "text-red-400" : "text-white/60"}`}>
            {stat.value}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className={`h-full rounded-full ${isLow ? "bg-red-400" : stat.color}`}
            initial={{ width: 0 }}
            animate={{ width: `${stat.value}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>
    </div>
  );
}

export function CreatureStatusBar({ energy, happiness, hunger, locale = "ko", compact = false }: CreatureStatusBarProps) {
  const stats = STATS.map((s) => ({
    ...s,
    value: s.key === "energy" ? energy : s.key === "happiness" ? happiness : hunger,
  }));

  const criticalCount = stats.filter((s) => s.value <= s.warnBelow).length;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {stats.map((stat) => (
          <div key={stat.key} className="flex items-center gap-1">
            <span className="text-xs">{stat.icon}</span>
            <div className="w-12 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${stat.value <= stat.warnBelow ? "bg-red-400" : stat.color}`}
                style={{ width: `${stat.value}%` }}
              />
            </div>
          </div>
        ))}
        {criticalCount > 0 && (
          <motion.span
            className="text-[10px] text-red-400 font-semibold"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 1.2 }}
          >
            !
          </motion.span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 space-y-2">
      {criticalCount > 0 && (
        <motion.p
          className="text-[10px] text-red-400 font-semibold text-center"
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          {locale === "ko" ? "크리처가 돌봄이 필요해요!" : "Your creature needs care!"}
        </motion.p>
      )}
      {stats.map((stat) => (
        <StatBar key={stat.key} stat={stat} locale={locale} />
      ))}
    </div>
  );
}
