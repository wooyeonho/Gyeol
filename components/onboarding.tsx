"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { haptic } from "@/lib/micro-interactions";

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useTranslations();

  const handleStart = useCallback(() => {
    haptic("tap");
    onComplete();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 px-4">
      <motion.section
        className="w-full max-w-md rounded-[2rem] border border-white/15 bg-black/70 p-6 text-center shadow-[0_0_80px_rgba(34,211,238,0.12)] backdrop-blur-xl sm:p-8"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10">
          <span className="text-4xl" aria-hidden="true">
            ✨
          </span>
        </div>
        <p className="mt-6 text-sm font-medium uppercase tracking-[0.22em] text-cyan-100/85">
          {t("onboarding.eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          {t("onboarding.instantTitle")}
        </h1>
        <p className="mt-4 text-base leading-7 text-white/82">
          {t("onboarding.instantBody")}
        </p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
          <p className="text-sm font-medium text-white">{t("onboarding.instantChecklistTitle")}</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-white/78">
            <li>{t("onboarding.instantChecklist1")}</li>
            <li>{t("onboarding.instantChecklist2")}</li>
            <li>{t("onboarding.instantChecklist3")}</li>
          </ul>
        </div>
        <div className="mt-8 flex flex-col gap-3">
          <motion.button
            type="button"
            onClick={handleStart}
            className="min-h-12 rounded-full bg-cyan-400 px-6 text-base font-semibold text-black transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            whileTap={{ scale: 0.98 }}
          >
            {t("onboarding.start")}
          </motion.button>
          <button
            type="button"
            onClick={handleStart}
            className="min-h-12 rounded-full border border-white/20 bg-white/5 px-6 text-base font-medium text-white/88 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {t("onboarding.skip")}
          </button>
        </div>
      </motion.section>
    </div>
  );
}
