"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type StoryEvent,
  type StoryChoice,
  makeChoice,
} from "@/lib/game/narrative-system";
import { haptic } from "@/lib/micro-interactions";
import { FocusTrap } from "@/components/focus-trap";

const CHOICE_TYPE_COLORS: Record<string, string> = {
  kind: "#f472b6",
  bold: "#ef4444",
  curious: "#38bdf8",
  playful: "#fbbf24",
  serious: "#94a3b8",
  rebellious: "#a855f7",
};

interface StoryEventModalProps {
  event: StoryEvent;
  locale?: string;
  onComplete: (result: { dnaEffects: { axis: string; delta: number }[]; affinityDelta: number }) => void;
  onDismiss: () => void;
}

export function StoryEventModal({ event, locale = "ko", onComplete, onDismiss }: StoryEventModalProps) {
  const [phase, setPhase] = useState<"intro" | "chosen">("intro");
  const [chosenResult, setChosenResult] = useState<{
    outcome: { ko: string; en: string };
    dnaEffects: { axis: string; delta: number }[];
    affinityDelta: number;
  } | null>(null);
  const isKo = locale === "ko";

  const handleChoice = useCallback((choice: StoryChoice) => {
    haptic("success");
    const result = makeChoice(event.id, choice.id);
    if (result) {
      setChosenResult(result);
      setPhase("chosen");
    }
  }, [event.id]);

  const handleDone = useCallback(() => {
    if (chosenResult) {
      onComplete({
        dnaEffects: chosenResult.dnaEffects,
        affinityDelta: chosenResult.affinityDelta,
      });
    }
    onDismiss();
  }, [chosenResult, onComplete, onDismiss]);

  return (
    <FocusTrap active onEscape={onDismiss}>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="w-full max-w-md rounded-3xl border border-white/15 bg-gradient-to-b from-slate-900 to-black p-6 shadow-[0_0_60px_rgba(34,211,238,0.1)]"
      >
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Event title */}
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/10"
                >
                  <span className="text-3xl" aria-hidden="true">📖</span>
                </motion.div>
                <h2 className="text-xl font-semibold text-white">
                  {isKo ? event.title.ko : event.title.en}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-white/70">
                  {isKo ? event.description.ko : event.description.en}
                </p>
              </div>

              {/* Choices */}
              <div className="mt-6 space-y-2.5">
                {event.choices.map((choice, i) => (
                  <motion.button
                    key={choice.id}
                    type="button"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    onClick={() => handleChoice(choice)}
                    className="group w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-all hover:border-white/20 hover:bg-white/[0.08] active:scale-[0.98]"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: CHOICE_TYPE_COLORS[choice.type] }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white group-hover:text-cyan-200 transition-colors">
                          {isKo ? choice.label.ko : choice.label.en}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {choice.dnaEffects.slice(0, 2).map((eff) => (
                            <span key={eff.axis} className="text-[10px] text-white/30">
                              {eff.axis} {eff.delta > 0 ? "↑" : "↓"}
                            </span>
                          ))}
                          {choice.affinityDelta !== 0 && (
                            <span className={`text-[10px] ${choice.affinityDelta > 0 ? "text-pink-400/50" : "text-red-400/50"}`}>
                              {choice.affinityDelta > 0 ? "♡" : "💔"} {choice.affinityDelta > 0 ? "+" : ""}{choice.affinityDelta}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {phase === "chosen" && chosenResult && (
            <motion.div
              key="chosen"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
                className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10"
              >
                <span className="text-3xl" aria-hidden="true">✨</span>
              </motion.div>

              <p className="text-sm leading-relaxed text-white/80">
                {isKo ? chosenResult.outcome.ko : chosenResult.outcome.en}
              </p>

              {/* DNA effects display */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {chosenResult.dnaEffects.map((eff) => (
                  <span
                    key={eff.axis}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      eff.delta > 0
                        ? "bg-emerald-400/10 text-emerald-400"
                        : "bg-red-400/10 text-red-400"
                    }`}
                  >
                    {eff.axis} {eff.delta > 0 ? "+" : ""}{(eff.delta * 100).toFixed(0)}%
                  </span>
                ))}
                {chosenResult.affinityDelta !== 0 && (
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    chosenResult.affinityDelta > 0 ? "bg-pink-400/10 text-pink-400" : "bg-red-400/10 text-red-400"
                  }`}>
                    {isKo ? "친밀도" : "Affinity"} {chosenResult.affinityDelta > 0 ? "+" : ""}{chosenResult.affinityDelta}
                  </span>
                )}
              </div>

              <motion.button
                type="button"
                onClick={handleDone}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-6 rounded-full bg-cyan-400/90 px-6 py-2.5 text-sm font-semibold text-black transition-all hover:bg-cyan-300"
              >
                {isKo ? "계속하기" : "Continue"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
    </FocusTrap>
  );
}
