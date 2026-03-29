"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic, playSound } from "@/lib/micro-interactions";
import { type MysteryBox, type BoxRarity } from "@/lib/engagement/mystery-box";
import { useTranslations } from "@/components/i18n-provider";

interface MysteryBoxOverlayProps {
  box: MysteryBox;
  onClose: () => void;
}

const RARITY_STYLE: Record<BoxRarity, { glow: string; color: string; label: string; particle: string }> = {
  common:    { glow: "rgba(148,163,184,0.4)",  color: "#94a3b8", label: "Common",    particle: "bg-slate-300" },
  rare:      { glow: "rgba(59,130,246,0.5)",   color: "#3b82f6", label: "Rare",      particle: "bg-blue-400" },
  epic:      { glow: "rgba(168,85,247,0.6)",   color: "#a855f7", label: "Epic",      particle: "bg-purple-400" },
  legendary: { glow: "rgba(245,158,11,0.7)",   color: "#f59e0b", label: "Legendary", particle: "bg-amber-400" },
};

export function MysteryBoxOverlay({ box, onClose }: MysteryBoxOverlayProps) {
  const { t } = useTranslations();
  const [phase, setPhase] = useState<"shake" | "crack" | "reveal">("shake");
  const style = RARITY_STYLE[box.rarity];

  useEffect(() => {
    haptic("tap");
    const t1 = setTimeout(() => { setPhase("crack"); haptic("tap"); }, 900);
    const t2 = setTimeout(() => {
      setPhase("reveal");
      haptic("success");
      try { playSound("levelUp"); } catch { /* blocked */ }
    }, 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full max-w-sm text-center">
        {/* Box animation */}
        <div className="relative flex items-center justify-center mb-8">
          {/* Glow rings */}
          {phase === "reveal" && (
            <>
              <motion.div
                className="absolute rounded-full"
                style={{ background: style.glow, width: 160, height: 160, filter: "blur(30px)" }}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.4, 0] }}
                transition={{ duration: 1.2 }}
              />
              {/* Particles */}
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`absolute h-2 w-2 rounded-full ${style.particle}`}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos((i / 12) * Math.PI * 2) * 80,
                    y: Math.sin((i / 12) * Math.PI * 2) * 80,
                    opacity: 0,
                    scale: 0.5,
                  }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                />
              ))}
            </>
          )}

          <motion.div
            className="relative z-10 text-7xl select-none"
            animate={
              phase === "shake"
                ? { rotate: [-5, 5, -5, 5, 0], scale: [1, 1.05, 1, 1.05, 1] }
                : phase === "crack"
                  ? { scale: [1, 1.2, 0.9, 1.3], rotate: [0, -8, 8, 0] }
                  : { scale: 1.2, opacity: 0 }
            }
            transition={
              phase === "shake"
                ? { duration: 0.8, repeat: 1 }
                : phase === "crack"
                  ? { duration: 0.5 }
                  : { duration: 0.3 }
            }
          >
            {box.icon}
          </motion.div>
        </div>

        {/* Reveal */}
        <AnimatePresence>
          {phase === "reveal" && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="text-xs font-medium uppercase tracking-widest mb-2" style={{ color: style.color }}>
                {style.label}
              </p>
              <h2 className="text-xl font-bold text-white mb-6">{box.label.ko}</h2>

              <div className="space-y-3 mb-8">
                {box.drops.map((drop, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.12 }}
                    className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-left"
                    style={{ borderColor: `${style.color}40`, background: `${style.color}0d` }}
                  >
                    <span className="text-2xl">{drop.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{drop.label.ko}</p>
                      <p className="text-xs text-white/50">x{drop.amount}</p>
                    </div>
                    <span className="ml-auto text-xs font-medium uppercase" style={{ color: style.color }}>
                      {drop.rarity}
                    </span>
                  </motion.div>
                ))}
              </div>

              <motion.button
                type="button"
                onClick={onClose}
                whileTap={{ scale: 0.97 }}
                className="w-full rounded-full py-3 text-sm font-bold text-black transition-colors"
                style={{ background: style.color }}
              >
                받기
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {phase !== "reveal" && (
          <p className="text-sm text-white/40 animate-pulse">
            {phase === "shake" ? t("mysteryBox.opening") : t("mysteryBox.opened")}
          </p>
        )}
      </div>
    </motion.div>
  );
}
