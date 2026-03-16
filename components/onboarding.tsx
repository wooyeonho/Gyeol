"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { haptic } from "@/lib/micro-interactions";

const PERSONALITY_MODES = [
  "playful",
  "intimate",
  "strategic",
  "primal",
  "surreal",
  "reflective",
  "creative",
] as const;

type PersonalityMode = (typeof PERSONALITY_MODES)[number];

const MODE_EMOJIS: Record<PersonalityMode, string> = {
  playful: "\u{1F60A}",
  intimate: "\u{1F49C}",
  strategic: "\u{1F9E0}",
  primal: "\u{1F525}",
  surreal: "\u{1F30C}",
  reflective: "\u{1F319}",
  creative: "\u{1F3A8}",
};

const TOTAL_STEPS = 4;

interface OnboardingProps {
  onComplete: (selectedMode: PersonalityMode) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useTranslations();
  const [step, setStep] = useState(0);
  const [selectedMode, setSelectedMode] = useState<PersonalityMode>("playful");

  const handleNext = useCallback(() => {
    haptic("tap");
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      onComplete(selectedMode);
    }
  }, [step, selectedMode, onComplete]);

  const handleSkip = useCallback(() => {
    haptic("tap");
    onComplete(selectedMode);
  }, [selectedMode, onComplete]);

  const handleSelectMode = useCallback((mode: PersonalityMode) => {
    haptic("tap");
    setSelectedMode(mode);
  }, []);

  const slideVariants = {
    enter: { opacity: 0, x: 60 },
    center: { opacity: 1, x: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
    exit: { opacity: 0, x: -60, transition: { duration: 0.25, ease: "easeIn" as const } },
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 px-6">
      {/* Progress dots */}
      <div className="absolute top-12 flex gap-2" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-label={`Step ${step + 1} of ${TOTAL_STEPS}`}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i <= step ? "w-6 bg-cyan-400" : "w-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>

      {/* Skip button */}
      {step < TOTAL_STEPS - 1 && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute top-12 right-6 text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          {t("onboarding.skip")}
        </button>
      )}

      {/* Content area */}
      <div className="relative w-full max-w-sm min-h-[320px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full text-center"
          >
            {step === 0 && (
              <div>
                <motion.div
                  className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10"
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <span className="text-4xl">&#x2728;</span>
                </motion.div>
                <h1 className="text-2xl font-bold">{t("onboarding.welcome")}</h1>
                <p className="mt-3 text-sm leading-6 text-white/65">{t("onboarding.welcomeSub")}</p>
              </div>
            )}

            {step === 1 && (
              <div>
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
                  <span className="text-3xl">&#x1F331;</span>
                </div>
                <h2 className="text-xl font-semibold">{t("onboarding.step1Title")}</h2>
                <p className="mt-3 text-sm leading-6 text-white/65">{t("onboarding.step1Desc")}</p>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-xl font-semibold">{t("onboarding.step2Title")}</h2>
                <p className="mt-2 text-sm leading-6 text-white/65">{t("onboarding.step2Desc")}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2" role="radiogroup" aria-label="Personality mode">
                  {PERSONALITY_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={selectedMode === mode}
                      onClick={() => handleSelectMode(mode)}
                      className={`rounded-full border px-4 py-2 text-sm transition-all min-h-[44px] ${
                        selectedMode === mode
                          ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-100"
                          : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {MODE_EMOJIS[mode]} {t(`onboarding.mode${mode.charAt(0).toUpperCase() + mode.slice(1)}` as Parameters<typeof t>[0])}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
                  <span className="text-3xl">&#x1F381;</span>
                </div>
                <h2 className="text-xl font-semibold">{t("onboarding.step3Title")}</h2>
                <p className="mt-3 text-sm leading-6 text-white/65">{t("onboarding.step3Desc")}</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action button */}
      <motion.button
        type="button"
        onClick={handleNext}
        className="mt-8 rounded-full bg-cyan-500 px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-cyan-400"
        whileTap={{ scale: 0.96 }}
      >
        {step === TOTAL_STEPS - 1 ? t("onboarding.start") : t("onboarding.next")}
      </motion.button>
    </div>
  );
}
