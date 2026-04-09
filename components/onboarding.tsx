"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";
import { haptic, playSound } from "@/lib/micro-interactions";
import { FocusTrap } from "@/components/focus-trap";

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

const TOTAL_STEPS = 3; // Birth (auto) → Personality → Rewards

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
    <FocusTrap active onEscape={handleSkip}>
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
            {step === 1 && (
              <StepPersonality
                t={t}
                selectedMode={selectedMode}
                onSelectMode={(mode) => {
                  haptic("tap");
                  setSelectedMode(mode);
                }}
              />
            )}
            {step === 2 && <StepRewards t={t} />}
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
    </FocusTrap>
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

      {/* Social proof — competitor insight from Instagram/TikTok */}
      <SocialProofBanner t={t} />
    </>
  );
}

/** Social proof banner — shows community size + active users like TikTok/Instagram onboarding */
function SocialProofBanner({ t }: { t: (key: string) => string }) {
  const stats = [
    { label: t("onboarding.socialProofCreatures") || "고유 크리처 탄생", value: "344M+", icon: "🧬" },
    { label: t("onboarding.socialProofConversations") || "대화 나눔", value: "1.2M+", icon: "💬" },
    { label: t("onboarding.socialProofActive") || "오늘 활동 중", value: "8.4K", icon: "🔥" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="mt-4 rounded-2xl border border-white/8 bg-gradient-to-r from-white/[0.03] to-white/[0.06] p-3"
    >
      <div className="flex items-center justify-around">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col items-center gap-0.5">
            <span className="text-lg" aria-hidden="true">{stat.icon}</span>
            <span className="text-sm font-bold text-white">{stat.value}</span>
            <span className="text-[10px] text-white/45 leading-tight text-center">{stat.label}</span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-center text-[11px] text-white/40">
        {t("onboarding.socialProofJoin") || "지금 함께하는 사람들이 있어요"}
      </p>
    </motion.div>
  );
}

const DNA_AXES_DISPLAY = [
  "analytical","intuitive","verbal","spatial",
  "warmth","intensity","stability","openness",
  "assertiveness","empathy","playfulness","independence",
  "curiosity","persistence","adaptability","creativity",
] as const;

/**
 * Birth sequence — cinematic 5-second moment.
 * Dark void → spark → orb expansion → particle explosion → DNA 16축 결정 → creature forms.
 * No skip. This is THE emotional hook.
 */
function StepBirth({ t, onReady }: { t: (key: string) => string; onReady: () => void }) {
  const [phase, setPhase] = useState<"void" | "spark" | "expand" | "dna" | "born">("void");
  const [dnaRevealed, setDnaRevealed] = useState(0);
  const [dnaValues] = useState(() =>
    DNA_AXES_DISPLAY.map(() => Math.random() * 0.6 + 0.2)
  );

  useEffect(() => {
    const timers = [
      setTimeout(() => { setPhase("spark"); haptic("tap"); }, 600),
      setTimeout(() => { setPhase("expand"); haptic("tap"); }, 1400),
      setTimeout(() => { setPhase("dna"); haptic("success"); try { playSound("levelUp"); } catch { /* blocked */ } }, 2600),
      ...DNA_AXES_DISPLAY.map((_, i) =>
        setTimeout(() => setDnaRevealed(i + 1), 2800 + i * 100)
      ),
      setTimeout(() => { setPhase("born"); haptic("success"); }, 4600),
      setTimeout(() => onReady(), 5200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onReady]);

  return (
    <div className="flex flex-col items-center justify-center py-4" role="status" aria-label={t("onboarding.birthLabel")}>
      {/* Orb — living creature preview with breathing animation after birth */}
      <div className="relative flex items-center justify-center" style={{ height: 120 }}>
        <motion.div
          className="rounded-full"
          animate={{
            width: phase === "void" ? 4 : phase === "spark" ? 16 : phase === "expand" ? 72 : phase === "dna" ? 56 : 80,
            height: phase === "void" ? 4 : phase === "spark" ? 16 : phase === "expand" ? 72 : phase === "dna" ? 56 : 80,
            backgroundColor:
              phase === "void" ? "rgba(255,255,255,0.04)" :
              phase === "spark" ? "rgba(34,211,238,0.5)" :
              phase === "expand" ? "rgba(34,211,238,0.7)" :
              phase === "dna" ? "rgba(168,85,247,0.6)" :
              "rgba(34,211,238,0.9)",
            boxShadow:
              phase === "void" ? "none" :
              phase === "spark" ? "0 0 30px rgba(34,211,238,0.5)" :
              phase === "expand" ? "0 0 60px rgba(34,211,238,0.5), 0 0 120px rgba(34,211,238,0.2)" :
              phase === "dna" ? "0 0 40px rgba(168,85,247,0.4), 0 0 80px rgba(168,85,247,0.2)" :
              "0 0 80px rgba(34,211,238,0.7), 0 0 160px rgba(34,211,238,0.3)",
            // After birth: gentle breathing scale animation
            scale: phase === "born" ? [1, 1.06, 1] : 1,
          }}
          transition={phase === "born"
            ? { scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }, duration: 0.5 }
            : { duration: phase === "expand" ? 0.8 : 0.5, ease: "easeOut" }
          }
        />
        {/* Ripple rings on birth */}
        {phase === "born" && (
          <>
            <motion.div
              className="absolute rounded-full border border-cyan-400/40"
              initial={{ width: 80, height: 80, opacity: 0.8 }}
              animate={{ width: 180, height: 180, opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
            <motion.div
              className="absolute rounded-full border border-cyan-400/20"
              initial={{ width: 80, height: 80, opacity: 0.5 }}
              animate={{ width: 220, height: 220, opacity: 0 }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.15 }}
            />
          </>
        )}
      </div>

      {/* DNA axes reveal */}
      <AnimatePresence>
        {(phase === "dna" || phase === "born") && (
          <motion.div
            key="dna-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 grid grid-cols-4 gap-x-3 gap-y-1.5 w-full"
          >
            {DNA_AXES_DISPLAY.map((axis, i) => (
              <motion.div
                key={axis}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={i < dnaRevealed ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col items-center gap-0.5"
              >
                <span className="text-[8px] text-white/40 uppercase tracking-wide">{axis.slice(0,3)}</span>
                <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `hsl(${180 + i * 11}, 80%, 60%)` }}
                    initial={{ width: "0%" }}
                    animate={i < dnaRevealed ? { width: `${dnaValues[i] * 100}%` } : { width: "0%" }}
                    transition={{ duration: 0.3, delay: 0.05 }}
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status text */}
      <AnimatePresence mode="wait">
        {phase === "void" && (
          <motion.p key="void" initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} exit={{ opacity: 0 }}
            className="mt-4 text-xs text-white/30">...</motion.p>
        )}
        {phase === "spark" && (
          <motion.p key="spark" initial={{ opacity: 0 }} animate={{ opacity: 0.8 }} exit={{ opacity: 0 }}
            className="mt-4 text-sm text-cyan-300/80">
            {t("onboarding.birthSpark") || "무언가 깨어나고 있어..."}
          </motion.p>
        )}
        {phase === "expand" && (
          <motion.p key="expand" initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} exit={{ opacity: 0 }}
            className="mt-4 text-sm text-cyan-200">
            {t("onboarding.birthAlive") || "생명이 형성되고 있어..."}
          </motion.p>
        )}
        {phase === "dna" && (
          <motion.p key="dna" initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} exit={{ opacity: 0 }}
            className="mt-3 text-xs text-purple-300/80">
            {t("onboarding.birthDNA") || "DNA가 결정되고 있어..."}
          </motion.p>
        )}
        {phase === "born" && (
          <motion.div key="born" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-center">
            <p className="text-base font-semibold text-cyan-200">
              {t("onboarding.birthNotice") || "탄생했어."}
            </p>
            <motion.p
              className="mt-1.5 text-xs text-white/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {t("onboarding.birthUnique") || "이 생명체는 세상에 단 하나뿐이야. 너만의 존재."}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
