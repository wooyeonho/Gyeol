"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FocusTrap } from "@/components/focus-trap";

/* ── Constants ── */

const STORAGE_KEY = "gyeol_tutorial_done";

type PositionHint = "top" | "center" | "bottom";

interface TutorialStep {
  id: string;
  titleKo: string;
  titleEn: string;
  description: string;
  positionHint: PositionHint;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "meet-creature",
    titleKo: "생명체를 만나보세요",
    titleEn: "Meet your creature",
    description:
      "This is your unique companion — born from DNA that only you possess. Watch it grow, evolve, and react to your care.",
    positionHint: "center",
  },
  {
    id: "chat",
    titleKo: "대화를 나눠보세요",
    titleEn: "Chat with them",
    description:
      "Talk to your creature through the chat panel. Your words shape its personality and deepen your bond over time.",
    positionHint: "bottom",
  },
  {
    id: "dna",
    titleKo: "DNA를 확인하세요",
    titleEn: "Check their DNA",
    description:
      "Every creature has a unique genetic code that determines its traits, colors, and hidden abilities. Explore it in the DNA viewer.",
    positionHint: "center",
  },
  {
    id: "challenges",
    titleKo: "일일 도전을 완료하세요",
    titleEn: "Daily challenges",
    description:
      "Complete daily challenges to earn rewards, unlock new evolutions, and keep your creature happy and thriving.",
    positionHint: "top",
  },
  {
    id: "explore",
    titleKo: "세계를 탐험하세요",
    titleEn: "Explore & discover",
    description:
      "Venture into different biomes, discover rare items, and meet other creatures in the ever-expanding world of Gyeol.",
    positionHint: "bottom",
  },
];

/* ── Position helpers ── */

function getContentPosition(hint: PositionHint): string {
  switch (hint) {
    case "top":
      return "items-start pt-24";
    case "bottom":
      return "items-end pb-32";
    case "center":
    default:
      return "items-center";
  }
}

function getSpotlightPosition(hint: PositionHint): { top: string; left: string } {
  switch (hint) {
    case "top":
      return { top: "18%", left: "50%" };
    case "bottom":
      return { top: "70%", left: "50%" };
    case "center":
    default:
      return { top: "45%", left: "50%" };
  }
}

/* ── Hook ── */

export function useShouldShowTutorial(): boolean {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY);
      setShouldShow(done !== "true");
    } catch {
      // localStorage unavailable (SSR, private browsing, etc.)
      setShouldShow(false);
    }
  }, []);

  return shouldShow;
}

/* ── Spotlight SVG mask ── */

function SpotlightMask({ positionHint }: { positionHint: PositionHint }) {
  const pos = getSpotlightPosition(positionHint);

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
        <defs>
          <radialGradient id="spotlight-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="black" stopOpacity="0" />
            <stop offset="70%" stopColor="black" stopOpacity="0" />
            <stop offset="100%" stopColor="black" stopOpacity="0.85" />
          </radialGradient>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <ellipse
              cx={pos.left}
              cy={pos.top}
              rx="140"
              ry="120"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.75)"
          mask="url(#spotlight-mask)"
        />
      </svg>

      {/* Glowing ring around spotlight */}
      <motion.div
        className="absolute w-72 h-60 rounded-full border-2 border-purple-400/40 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{ top: pos.top, left: pos.left }}
        animate={{
          boxShadow: [
            "0 0 20px 4px rgba(168,85,247,0.15)",
            "0 0 40px 8px rgba(168,85,247,0.25)",
            "0 0 20px 4px rgba(168,85,247,0.15)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}

/* ── Progress dots ── */

function ProgressDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <div className="flex items-center gap-2" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          className="rounded-full"
          animate={{
            width: i === current ? 24 : 8,
            height: 8,
            backgroundColor:
              i === current ? "rgba(168,85,247,1)" : "rgba(255,255,255,0.3)",
          }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      ))}
    </div>
  );
}

/* ── Tutorial Overlay ── */

export interface TutorialOverlayProps {
  onComplete?: () => void;
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const totalSteps = TUTORIAL_STEPS.length;

  const markDone = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* noop */
    }
    setVisible(false);
    onComplete?.();
  }, [onComplete]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      markDone();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLastStep, markDone]);

  const handleSkip = useCallback(() => {
    markDone();
  }, [markDone]);

  // Allow keyboard navigation
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      } else if (e.key === "Escape") {
        handleSkip();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleNext, handleSkip]);

  const contentPositionClass = useMemo(
    () => getContentPosition(step.positionHint),
    [step.positionHint],
  );

  return (
    <AnimatePresence>
      {visible && (
        <FocusTrap active onEscape={handleSkip}>
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          aria-label="Tutorial"
        >
          {/* Spotlight layer */}
          <AnimatePresence mode="wait">
            <SpotlightMask key={step.id} positionHint={step.positionHint} />
          </AnimatePresence>

          {/* Content layer */}
          <div
            className={`relative z-10 flex flex-col ${contentPositionClass} justify-center w-full h-full pointer-events-none`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                className="flex flex-col items-center text-center max-w-md mx-auto pointer-events-auto"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.97 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Step counter */}
                <span className="text-xs font-medium tracking-widest uppercase text-purple-300/70 mb-3">
                  {currentStep + 1} / {totalSteps}
                </span>

                {/* Korean title */}
                <h2 className="text-2xl font-bold text-white mb-1">
                  {step.titleKo}
                </h2>

                {/* English subtitle */}
                <p className="text-sm font-medium text-white/50 mb-4">
                  {step.titleEn}
                </p>

                {/* Description */}
                <p className="text-sm leading-relaxed text-white/70 mb-8 max-w-xs">
                  {step.description}
                </p>

                {/* Progress dots */}
                <ProgressDots total={totalSteps} current={currentStep} />

                {/* Buttons */}
                <div className="flex items-center gap-3 mt-6">
                  {!isLastStep && (
                    <motion.button
                      type="button"
                      onClick={handleSkip}
                      whileTap={{ scale: 0.95 }}
                      className="rounded-full border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white/70"
                    >
                      건너뛰기 Skip
                    </motion.button>
                  )}

                  <motion.button
                    type="button"
                    onClick={handleNext}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-full bg-purple-500 px-8 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-colors hover:bg-purple-400"
                  >
                    {isLastStep ? "시작하기 Let's go!" : "다음 Next"}
                  </motion.button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}
