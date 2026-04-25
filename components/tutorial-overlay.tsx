"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FocusTrap } from "@/components/focus-trap";

/* ── Types ── */

export type TutorialPlacement = "top" | "bottom" | "left" | "right";

export interface TutorialStep {
  target: string;
  title: string;
  description: string;
  placement?: TutorialPlacement;
}

export interface TutorialOverlayProps {
  steps: TutorialStep[];
  onComplete: () => void;
  storageKey?: string;
}

/* ── Constants ── */

const DEFAULT_STORAGE_KEY = "gyeol_tutorial_done";
const SPOTLIGHT_PADDING = 12;
const TOOLTIP_GAP = 14;

/* ── Helpers ── */

function getTargetRect(selector: string): DOMRect | null {
  try {
    const el = document.querySelector(selector);
    if (!el) return null;
    return el.getBoundingClientRect();
  } catch {
    return null;
  }
}

/** Resolve which side to place the tooltip based on available viewport space. */
function resolvePlacement(
  rect: DOMRect,
  preferred: TutorialPlacement,
): TutorialPlacement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Check if preferred placement has enough space (at least 120px for tooltip)
  switch (preferred) {
    case "top":
      if (rect.top - SPOTLIGHT_PADDING - TOOLTIP_GAP > 140) return "top";
      break;
    case "bottom":
      if (vh - rect.bottom - SPOTLIGHT_PADDING - TOOLTIP_GAP > 140) return "bottom";
      break;
    case "left":
      if (rect.left - SPOTLIGHT_PADDING - TOOLTIP_GAP > 220) return "left";
      break;
    case "right":
      if (vw - rect.right - SPOTLIGHT_PADDING - TOOLTIP_GAP > 220) return "right";
      break;
  }

  // Fallback: pick whichever side has the most space
  const spaceTop = rect.top;
  const spaceBottom = vh - rect.bottom;
  const spaceLeft = rect.left;
  const spaceRight = vw - rect.right;

  const max = Math.max(spaceTop, spaceBottom, spaceLeft, spaceRight);
  if (max === spaceBottom) return "bottom";
  if (max === spaceTop) return "top";
  if (max === spaceRight) return "right";
  return "left";
}

function getTooltipStyle(
  rect: DOMRect,
  placement: TutorialPlacement,
): React.CSSProperties {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  switch (placement) {
    case "top":
      return {
        left: Math.max(16, Math.min(cx - 150, window.innerWidth - 316)),
        top: rect.top - SPOTLIGHT_PADDING - TOOLTIP_GAP,
        transform: "translateY(-100%)",
        maxWidth: 300,
      };
    case "bottom":
      return {
        left: Math.max(16, Math.min(cx - 150, window.innerWidth - 316)),
        top: rect.bottom + SPOTLIGHT_PADDING + TOOLTIP_GAP,
        maxWidth: 300,
      };
    case "left":
      return {
        left: rect.left - SPOTLIGHT_PADDING - TOOLTIP_GAP,
        top: Math.max(16, Math.min(cy - 60, window.innerHeight - 180)),
        transform: "translateX(-100%)",
        maxWidth: 260,
      };
    case "right":
      return {
        left: rect.right + SPOTLIGHT_PADDING + TOOLTIP_GAP,
        top: Math.max(16, Math.min(cy - 60, window.innerHeight - 180)),
        maxWidth: 260,
      };
  }
}

/* ── Hook: should show tutorial ── */

export function useShouldShowTutorial(storageKey?: string): boolean {
  const key = storageKey ?? DEFAULT_STORAGE_KEY;
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    try {
      const done = localStorage.getItem(key);
      setShouldShow(done !== "true");
    } catch {
      setShouldShow(false);
    }
  }, [key]);

  return shouldShow;
}

/* ── Spotlight SVG ── */

function SpotlightOverlay({ rect }: { rect: DOMRect | null }) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920;
  const vh = typeof window !== "undefined" ? window.innerHeight : 1080;

  // When no target element is found, dim the entire screen
  const spotX = rect ? rect.left - SPOTLIGHT_PADDING : vw / 2;
  const spotY = rect ? rect.top - SPOTLIGHT_PADDING : vh / 2;
  const spotW = rect ? rect.width + SPOTLIGHT_PADDING * 2 : 0;
  const spotH = rect ? rect.height + SPOTLIGHT_PADDING * 2 : 0;
  const rx = Math.min(16, spotW / 4, spotH / 4);

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    >
      <defs>
        <mask id="tutorial-spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          {rect && (
            <rect
              x={spotX}
              y={spotY}
              width={spotW}
              height={spotH}
              rx={rx}
              ry={rx}
              fill="black"
            />
          )}
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.72)"
        mask="url(#tutorial-spotlight-mask)"
      />
    </svg>
  );
}

/* ── Glow ring ── */

function SpotlightGlow({ rect }: { rect: DOMRect | null }) {
  if (!rect) return null;

  return (
    <motion.div
      className="absolute pointer-events-none border-2 border-purple-400/40"
      style={{
        left: rect.left - SPOTLIGHT_PADDING - 2,
        top: rect.top - SPOTLIGHT_PADDING - 2,
        width: rect.width + (SPOTLIGHT_PADDING + 2) * 2,
        height: rect.height + (SPOTLIGHT_PADDING + 2) * 2,
        borderRadius: Math.min(18, (rect.width + SPOTLIGHT_PADDING * 2) / 4),
      }}
      animate={{
        boxShadow: [
          "0 0 16px 2px rgba(168,85,247,0.15)",
          "0 0 32px 6px rgba(168,85,247,0.28)",
          "0 0 16px 2px rgba(168,85,247,0.15)",
        ],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ── Tooltip ── */

interface TooltipProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  rect: DOMRect | null;
  onNext: () => void;
  onSkip: () => void;
}

function Tooltip({ step, stepIndex, totalSteps, rect, onNext, onSkip }: TooltipProps) {
  const isLastStep = stepIndex === totalSteps - 1;
  const placement = rect
    ? resolvePlacement(rect, step.placement ?? "bottom")
    : "bottom";

  const style: React.CSSProperties = rect
    ? getTooltipStyle(rect, placement)
    : {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: 300,
      };

  return (
    <motion.div
      key={`tooltip-${stepIndex}`}
      className="absolute z-10 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-5 shadow-2xl shadow-black/50 pointer-events-auto"
      style={style}
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.97 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Step counter */}
      <span className="text-xs font-medium tracking-widest uppercase text-purple-300/70 mb-2 block">
        {stepIndex + 1}/{totalSteps}
      </span>

      {/* Title */}
      <h2 className="text-base font-bold text-white mb-1.5">
        {step.title}
      </h2>

      {/* Description */}
      <p className="text-sm leading-relaxed text-white/70 mb-5">
        {step.description}
      </p>

      {/* Buttons */}
      <div className="flex items-center gap-3">
        {!isLastStep && (
          <motion.button
            type="button"
            onClick={onSkip}
            whileTap={{ scale: 0.95 }}
            className="rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white/70"
          >
            건너뛰기
          </motion.button>
        )}

        <motion.button
          type="button"
          onClick={onNext}
          whileTap={{ scale: 0.95 }}
          className="rounded-full bg-purple-500 px-6 py-2 text-xs font-semibold text-white shadow-lg shadow-purple-500/25 transition-colors hover:bg-purple-400"
        >
          {isLastStep ? "시작하기" : "다음"}
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── Main TutorialOverlay ── */

export function TutorialOverlay({ steps, onComplete, storageKey }: TutorialOverlayProps) {
  const key = storageKey ?? DEFAULT_STORAGE_KEY;
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const step = steps[currentStep];
  const totalSteps = steps.length;

  // Measure target element position
  const measureTarget = useCallback(() => {
    if (!step) return;
    const rect = getTargetRect(step.target);
    setTargetRect(rect);
  }, [step]);

  // Measure on step change and window resize/scroll
  useLayoutEffect(() => {
    measureTarget();
  }, [measureTarget]);

  useEffect(() => {
    const handleResize = () => measureTarget();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [measureTarget]);

  // Re-measure periodically in case elements load lazily
  useEffect(() => {
    if (targetRect) return;
    const interval = setInterval(() => {
      const rect = getTargetRect(step?.target ?? "");
      if (rect) {
        setTargetRect(rect);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [step, targetRect]);

  const markDone = useCallback(() => {
    try {
      localStorage.setItem(key, "true");
    } catch {
      /* noop */
    }
    setVisible(false);
    onComplete();
  }, [key, onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep >= totalSteps - 1) {
      markDone();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps, markDone]);

  const handleSkip = useCallback(() => {
    markDone();
  }, [markDone]);

  // Keyboard navigation
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

  if (!steps.length) return null;

  return (
    <AnimatePresence>
      {visible && (
        <FocusTrap active onEscape={handleSkip}>
          <motion.div
            className="fixed inset-0 z-[100] pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            role="dialog"
            aria-label="Tutorial"
            aria-modal="true"
          >
            {/* Dark overlay with spotlight cutout */}
            <SpotlightOverlay rect={targetRect} />

            {/* Glowing ring around target */}
            <SpotlightGlow rect={targetRect} />

            {/* Tooltip */}
            <div className="absolute inset-0 pointer-events-none">
              <AnimatePresence mode="wait">
                <Tooltip
                  key={currentStep}
                  step={step}
                  stepIndex={currentStep}
                  totalSteps={totalSteps}
                  rect={targetRect}
                  onNext={handleNext}
                  onSkip={handleSkip}
                />
              </AnimatePresence>
            </div>
          </motion.div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}
