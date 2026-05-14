"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CreatureActivity } from "@/hooks/use-creature-state";
import { useTranslations } from "@/components/i18n-provider";
import { getEvolutionCopy } from "@/lib/identity/evolution-copy";

export function CreatureStatusIndicator({ activity }: { activity: CreatureActivity }) {
  const { t } = useTranslations();

  const isVisible = activity !== "awake";
  const label = activity === "sleeping" ? t("creature.sleeping") : t("creature.drowsy");
  const icon = activity === "sleeping" ? "💤" : "😴";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={activity}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          aria-live="polite"
          className="mx-auto mt-2 flex w-fit items-center gap-1.5 rounded-full px-3 py-1"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <span className="text-xs" style={{ animation: activity === "sleeping" ? "creatureBreathe 3s ease-in-out infinite" : "creatureBreathe 2s ease-in-out infinite" }}>
            {icon}
          </span>
          <span className="text-[11px] text-white/50">{label}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CreatureGrowthPulse({
  locale,
  summary,
}: {
  locale: string;
  summary: "memory" | "curiosity" | "playful" | "trust" | "deep" | null;
}) {
  if (!summary) return null;
  const label = getEvolutionCopy(summary, locale);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mx-auto mt-2 w-fit rounded-full border border-emerald-200/25 bg-emerald-100/10 px-3 py-1 text-[11px] text-emerald-100/90"
      aria-live="polite"
    >
      {label}
    </motion.div>
  );
}
