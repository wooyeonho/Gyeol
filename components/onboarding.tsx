"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { haptic } from "@/lib/micro-interactions";

export type PersonalityMode =
  | "playful"
  | "intimate"
  | "strategic"
  | "primal"
  | "surreal"
  | "reflective"
  | "creative";

interface OnboardingProps {
  onComplete: (selectedMode: PersonalityMode) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useTranslations();
  // By default, just start with a neutral/playful base.
  // The system will evolve to their real personality based on the chat.
  const [selectedMode] = useState<PersonalityMode>("playful");

  const handleStart = useCallback(() => {
    haptic("tap");
    onComplete(selectedMode);
  }, [selectedMode, onComplete]);

  const slideVariants = {
    enter: { opacity: 0, y: 20 },
    center: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: "easeIn" as const } },
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 px-6">
      <div className="relative w-full max-w-sm min-h-[320px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key="step0"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full text-center"
          >
            <motion.div
              className="mx-auto mb-8 flex h-32 w-32 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10 shadow-[0_0_80px_rgba(34,211,238,0.2)]"
              animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-5xl">&#x2728;</span>
            </motion.div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-4">
              {t("onboarding.welcome") || "결과 대화를 시작할까요?"}
            </h1>
            <p className="text-base leading-7 text-white/70 max-w-[280px] mx-auto">
              {t("onboarding.welcomeSub") || "당신의 대화가 기억이 되고, 곧 이 존재의 성격이 됩니다."}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        onClick={handleStart}
        className="mt-12 rounded-full bg-cyan-500 px-10 py-4 text-base font-semibold text-black transition-colors hover:bg-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.4)]"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {t("onboarding.start") || "지금 바로 시작하기"}
      </motion.button>
    </div>
  );
}
