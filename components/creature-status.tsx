"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CreatureActivity } from "@/hooks/use-creature-state";
import { useTranslations } from "@/components/i18n-provider";

export function CreatureStatusIndicator({ activity }: { activity: CreatureActivity }) {
  const { t } = useTranslations();

  if (activity === "awake") return null;

  const label = activity === "sleeping" ? t("creature.sleeping") : t("creature.drowsy");
  const icon = activity === "sleeping" ? "💤" : "😴";

  return (
    <AnimatePresence>
      <motion.div
        key={activity}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mx-auto mt-2 flex w-fit items-center gap-1.5 rounded-full px-3 py-1"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <span className="text-xs" style={{ animation: activity === "sleeping" ? "creatureBreathe 3s ease-in-out infinite" : "creatureBreathe 2s ease-in-out infinite" }}>
          {icon}
        </span>
        <span className="text-[11px] text-white/50">{label}</span>
      </motion.div>
    </AnimatePresence>
  );
}
