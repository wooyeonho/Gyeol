"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { haptic, playSound } from "@/lib/micro-interactions";

interface OnboardingProps {
  onComplete: (personalityMode?: string) => void;
}

const PERSONALITY_MODES = [
  { key: "playful", emoji: "🎭" },
  { key: "intimate", emoji: "💗" },
  { key: "strategic", emoji: "🧠" },
  { key: "primal", emoji: "🔥" },
  { key: "surreal", emoji: "🌀" },
  { key: "reflective", emoji: "🪞" },
  { key: "creative", emoji: "🎨" },
] as const;

const TOTAL_STEPS = 5; // Added birth sequence step

const slideVariants = {
  enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const { t } = useTranslations();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  const goNext = useCallback(() => {
    haptic("tap");
    setDirection(1);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  }, []);

  const goBack = useCallback(() => {
    haptic("tap");
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  const handleComplete = useCallback(() => {
    haptic("success");
    onComplete(selectedMode ?? undefined);
  }, [onComplete, selectedMode]);

  const handleSkip = useCallback(() => {
    haptic("tap");
    onComplete();
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 px-4">
      <motion.section
        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/15 bg-black/70 p-6 shadow-[0_0_80px_rgba(34,211,238,0.12)] backdrop-blur-xl sm:p-8"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* Progress dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-cyan-400"
                  : i < step
                    ? "w-1.5 bg-cyan-400/50"
                    : "w-1.5 bg-white/20"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="text-center"
          >
            {step === 0 && <StepBirth t={t} onReady={goNext} />}
            {step === 1 && <StepWelcome t={t} />}
            {step === 2 && <StepAlive t={t} />}
            {step === 3 && (
              <StepPersonality
                t={t}
                selectedMode={selectedMode}
                onSelectMode={(mode) => {
                  haptic("tap");
                  setSelectedMode(mode);
                }}
              />
            )}
            {step === 4 && <StepRewards t={t} />}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 flex flex-col gap-3">
          {step < TOTAL_STEPS - 1 ? (
            <>
              <motion.button
                type="button"
                onClick={goNext}
                className="min-h-12 rounded-full bg-cyan-400 px-6 text-base font-semibold text-black transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                whileTap={{ scale: 0.98 }}
              >
                {t("onboarding.next")}
              </motion.button>
              <div className="flex items-center justify-between">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="min-h-10 rounded-full px-4 text-sm font-medium text-white/60 transition-colors hover:text-white/90"
                  >
                    {t("common.back")}
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={handleSkip}
                  className="min-h-10 rounded-full px-4 text-sm font-medium text-white/60 transition-colors hover:text-white/90"
                >
                  {t("onboarding.skip")}
                </button>
              </div>
            </>
          ) : (
            <>
              <motion.button
                type="button"
                onClick={handleComplete}
                className="min-h-12 rounded-full bg-cyan-400 px-6 text-base font-semibold text-black transition-colors hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                whileTap={{ scale: 0.98 }}
              >
                {t("onboarding.start")}
              </motion.button>
              <button
                type="button"
                onClick={goBack}
                className="min-h-10 rounded-full px-4 text-sm font-medium text-white/60 transition-colors hover:text-white/90"
              >
                {t("common.back")}
              </button>
            </>
          )}
        </div>
      </motion.section>
    </div>
  );
}

/* ---------- Step sub-components ---------- */

function StepWelcome({ t }: { t: (key: string) => string }) {
  return (
    <>
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10">
        <span className="text-4xl" aria-hidden="true">✨</span>
      </div>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {t("onboarding.instantTitle")}
      </h1>
      <p className="mt-3 text-base leading-7 text-white/80">
        {t("onboarding.instantBody")}
      </p>
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
        <p className="text-sm font-medium text-white">{t("onboarding.instantChecklistTitle")}</p>
        <ul className="mt-2 space-y-1.5 text-sm leading-6 text-white/75">
          <li>{t("onboarding.instantChecklist1")}</li>
          <li>{t("onboarding.instantChecklist2")}</li>
          <li>{t("onboarding.instantChecklist3")}</li>
        </ul>
      </div>
    </>
  );
}

function StepAlive({ t }: { t: (key: string) => string }) {
  return (
    <>
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10">
        <span className="text-4xl" aria-hidden="true">🌱</span>
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {t("onboarding.step1Title")}
      </h2>
      <p className="mt-3 text-base leading-7 text-white/80">
        {t("onboarding.step1Desc")}
      </p>
    </>
  );
}

function StepPersonality({
  t,
  selectedMode,
  onSelectMode,
}: {
  t: (key: string) => string;
  selectedMode: string | null;
  onSelectMode: (mode: string) => void;
}) {
  return (
    <>
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-purple-400/30 bg-purple-400/10">
        <span className="text-4xl" aria-hidden="true">🎭</span>
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {t("onboarding.step2Title")}
      </h2>
      <p className="mt-3 text-base leading-7 text-white/80">
        {t("onboarding.step2Desc")}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {PERSONALITY_MODES.map((mode) => {
          const isSelected = selectedMode === mode.key;
          return (
            <button
              key={mode.key}
              type="button"
              onClick={() => onSelectMode(mode.key)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all ${
                isSelected
                  ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
                  : "border-white/10 bg-white/[0.04] text-white/75 hover:border-white/25 hover:bg-white/[0.08]"
              }`}
            >
              <span className="text-lg">{mode.emoji}</span>
              <span>{t(`onboarding.mode${mode.key.charAt(0).toUpperCase() + mode.key.slice(1)}`)}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function StepRewards({ t }: { t: (key: string) => string }) {
  return (
    <>
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/10">
        <span className="text-4xl" aria-hidden="true">🎁</span>
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {t("onboarding.step3Title")}
      </h2>
      <p className="mt-3 text-base leading-7 text-white/80">
        {t("onboarding.step3Desc")}
      </p>
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <h3 className="text-sm font-semibold text-white">{t("onboarding.step4Title")}</h3>
        <p className="mt-2 text-sm leading-6 text-white/75">
          {t("onboarding.step4Desc")}
        </p>
      </div>
    </>
  );
}

/**
 * Birth sequence — the magical first 3 seconds.
 * A pulsing orb of light that grows, flickers, and "wakes up".
 * This is THE moment that hooks users emotionally.
 */
function StepBirth({ t, onReady }: { t: (key: string) => string; onReady: () => void }) {
  const [phase, setPhase] = useState<"dark" | "spark" | "grow" | "alive">("dark");

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("spark"), 800),
      setTimeout(() => {
        setPhase("grow");
        haptic("tap");
      }, 1800),
      setTimeout(() => {
        setPhase("alive");
        haptic("success");
        try { playSound("levelUp"); } catch { /* audio may be blocked */ }
      }, 3000),
      setTimeout(() => onReady(), 4500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onReady]);

  return (
    <div className="flex flex-col items-center justify-center py-8" role="status" aria-label={t("onboarding.birthLabel")}>
      {/* The Orb */}
      <motion.div
        className="relative flex items-center justify-center"
        animate={{
          width: phase === "dark" ? 8 : phase === "spark" ? 24 : phase === "grow" ? 64 : 80,
          height: phase === "dark" ? 8 : phase === "spark" ? 24 : phase === "grow" ? 64 : 80,
        }}
        transition={{ duration: phase === "alive" ? 0.6 : 1, ease: "easeOut" }}
      >
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            backgroundColor:
              phase === "dark" ? "rgba(255,255,255,0.05)" :
              phase === "spark" ? "rgba(34,211,238,0.3)" :
              phase === "grow" ? "rgba(34,211,238,0.5)" :
              "rgba(34,211,238,0.8)",
            boxShadow:
              phase === "dark" ? "0 0 0 rgba(34,211,238,0)" :
              phase === "spark" ? "0 0 20px rgba(34,211,238,0.3)" :
              phase === "grow" ? "0 0 40px rgba(34,211,238,0.4), 0 0 80px rgba(34,211,238,0.2)" :
              "0 0 60px rgba(34,211,238,0.6), 0 0 120px rgba(34,211,238,0.3), 0 0 200px rgba(34,211,238,0.1)",
          }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        {phase === "alive" && (
          <motion.div
            className="absolute inset-[-20px] rounded-full border border-cyan-400/30"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 2] }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        )}
      </motion.div>

      {/* Text */}
      <AnimatePresence mode="wait">
        {phase === "dark" && (
          <motion.p
            key="dark"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="mt-8 text-sm text-white/40"
          >
            ...
          </motion.p>
        )}
        {phase === "spark" && (
          <motion.p
            key="spark"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            className="mt-8 text-sm text-cyan-300/70"
          >
            {t("onboarding.birthSpark")}
          </motion.p>
        )}
        {(phase === "grow" || phase === "alive") && (
          <motion.div
            key="alive"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 text-center"
          >
            <p className="text-lg font-semibold text-cyan-200">
              {t("onboarding.birthAlive")}
            </p>
            {phase === "alive" && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.5 }}
                className="mt-2 text-sm text-white/60"
              >
                {t("onboarding.birthNotice")}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
