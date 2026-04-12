"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { haptic } from "@/lib/micro-interactions";
import { rollD20, interpretRoll } from "@/lib/game/narrative-system";

/* ── Props ── */

export interface NarrativeEventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    choices: Array<{
      id: string;
      text: string;
      hint?: string;
    }>;
  };
  onChoose?: (choiceId: string) => void;
  outcome?: string | null;
  compact?: boolean;
}

/* ── Animation variants ── */

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
  exit: { opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.25 } },
};

const choiceVariants = {
  hidden: { opacity: 0, x: -14 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: 0.3 + i * 0.08, duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const selectedGlowAnimation = {
  scale: [1, 1.03, 1],
  boxShadow: [
    "0 0 0 rgba(56,189,248,0)",
    "0 0 24px rgba(56,189,248,0.35)",
    "0 0 10px rgba(56,189,248,0.15)",
  ],
  transition: { duration: 0.6, ease: "easeOut" as const },
};

const outcomeVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut", delay: 0.15 },
  },
};

/* ── Component ── */

export function NarrativeEventCard({
  event,
  onChoose,
  outcome,
  compact = false,
}: NarrativeEventCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const [rollResult, setRollResult] = useState<string | null>(null);

  const ROLL_COLORS: Record<string, string> = {
    critical_fail: "text-red-400",
    fail: "text-orange-400",
    partial: "text-yellow-400",
    success: "text-green-400",
    critical_success: "text-purple-400",
  };

  const ROLL_LABELS: Record<string, string> = {
    critical_fail: "Critical Fail!",
    fail: "Fail",
    partial: "Partial Success",
    success: "Success!",
    critical_success: "Critical Success!",
  };

  const handleChoose = useCallback(
    (choiceId: string) => {
      if (selectedId) return; // already chosen
      haptic("success");
      setSelectedId(choiceId);
      // Roll the D20 for BG3-style tension
      const roll = rollD20();
      const result = interpretRoll(roll);
      setDiceRoll(roll);
      setRollResult(result);
      // Fire the onChoose after a brief delay for the dice animation
      setTimeout(() => onChoose?.(choiceId), 800);
    },
    [selectedId, onChoose],
  );

  const showOutcome = selectedId && outcome;

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_0_40px_rgba(34,211,238,0.06)] ${
        compact ? "p-4" : "p-5"
      }`}
    >
      {/* Decorative glow accent */}
      <div
        className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-60 rounded-full bg-cyan-500/10 blur-3xl"
        aria-hidden="true"
      />

      {/* Title & description */}
      <div className={`relative ${compact ? "mb-3" : "mb-4"}`}>
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 22, delay: 0.1 }}
          className={`mx-auto mb-3 flex items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-400/10 ${
            compact ? "h-10 w-10" : "h-14 w-14"
          }`}
        >
          <span className={compact ? "text-lg" : "text-2xl"} aria-hidden="true">
            📖
          </span>
        </motion.div>

        <h3
          className={`text-center font-semibold text-white ${
            compact ? "text-base" : "text-lg"
          }`}
        >
          {event.title}
        </h3>
        <p
          className={`mt-1.5 text-center leading-relaxed text-white/65 ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {event.description}
        </p>
      </div>

      {/* Choices */}
      <AnimatePresence mode="wait">
        {!showOutcome && (
          <motion.div
            key="choices"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, height: 0, transition: { duration: 0.3 } }}
            className={`relative space-y-2 ${compact ? "" : "space-y-2.5"}`}
          >
            {event.choices.map((choice, i) => {
              const isSelected = selectedId === choice.id;
              const isDisabled = selectedId !== null;

              return (
                <motion.button
                  key={choice.id}
                  type="button"
                  custom={i}
                  variants={choiceVariants}
                  initial="hidden"
                  animate={isSelected ? selectedGlowAnimation : "visible"}
                  disabled={isDisabled}
                  onClick={() => handleChoose(choice.id)}
                  className={`group w-full rounded-xl border text-left transition-all ${
                    compact ? "p-3" : "p-3.5"
                  } ${
                    isSelected
                      ? "border-cyan-400/40 bg-cyan-400/10"
                      : isDisabled
                        ? "border-white/5 bg-white/[0.02] opacity-40"
                        : "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.98]"
                  }`}
                  aria-pressed={isSelected}
                >
                  <p
                    className={`font-medium transition-colors ${
                      compact ? "text-xs" : "text-sm"
                    } ${
                      isSelected
                        ? "text-cyan-200"
                        : "text-white group-hover:text-cyan-200"
                    }`}
                  >
                    {choice.text}
                  </p>
                  {choice.hint && (
                    <p
                      className={`mt-0.5 text-white/35 ${
                        compact ? "text-[10px]" : "text-xs"
                      }`}
                    >
                      {choice.hint}
                    </p>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* D20 Roll Result (BG3-inspired) */}
      <AnimatePresence>
        {diceRoll !== null && selectedId && !outcome && (
          <motion.div
            key="dice"
            initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="my-3 flex flex-col items-center gap-1"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/20 bg-white/[0.06] shadow-lg">
              <span className={`text-2xl font-bold tabular-nums ${rollResult ? ROLL_COLORS[rollResult] : "text-white"}`}>
                {diceRoll}
              </span>
            </div>
            {rollResult && (
              <p className={`text-xs font-medium ${ROLL_COLORS[rollResult]}`}>
                {ROLL_LABELS[rollResult]}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outcome */}
      <AnimatePresence>
        {showOutcome && (
          <motion.div
            key="outcome"
            variants={outcomeVariants}
            initial="hidden"
            animate="visible"
            className={`relative rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] ${
              compact ? "p-3" : "p-4"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="mt-0.5 text-base flex-shrink-0"
                aria-hidden="true"
              >
                ✨
              </motion.span>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-emerald-400/60 mb-1">
                  결과
                </p>
                <p
                  className={`leading-relaxed text-white/80 ${
                    compact ? "text-xs" : "text-sm"
                  }`}
                >
                  {outcome}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selection prompt when no choice yet */}
      {!selectedId && (
        <p className="mt-3 text-center text-[10px] text-white/25 tracking-wide">
          선택지를 골라주세요
        </p>
      )}
    </motion.div>
  );
}

export default NarrativeEventCard;
