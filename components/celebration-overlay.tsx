"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { haptic } from "@/lib/micro-interactions";

interface CelebrationOverlayProps {
  show: boolean;
  title: string;
  subtitle?: string;
  emoji?: string;
  onDone?: () => void;
}

const CONFETTI_COLORS = ["#f59e0b", "#a855f7", "#3b82f6", "#4ade80", "#f43f5e", "#818cf8"];

/**
 * Full-screen celebration overlay for achievements, evolution, challenge completion.
 * Inspired by Diablo loot drop + Genshin wish result animation.
 */
export function CelebrationOverlay({ show, title, subtitle, emoji = "🎉", onDone }: CelebrationOverlayProps) {
  const [particles] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 300,
      y: -(Math.random() * 400 + 100),
      rotation: Math.random() * 720 - 360,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: Math.random() * 8 + 4,
      delay: Math.random() * 0.3,
    })),
  );

  useEffect(() => {
    if (show) {
      haptic("success");
      const timer = setTimeout(() => onDone?.(), 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onDone}
          role="alert"
          aria-live="assertive"
        >
          {/* Confetti particles */}
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-sm"
              style={{ width: p.size, height: p.size * 0.6, backgroundColor: p.color, top: "50%", left: "50%" }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: p.x, y: p.y, rotate: p.rotation, opacity: 0 }}
              transition={{ duration: 1.5, delay: p.delay, ease: "easeOut" }}
            />
          ))}

          {/* Central content */}
          <motion.div
            className="text-center z-10"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
          >
            <motion.div
              className="text-7xl mb-4"
              animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {emoji}
            </motion.div>
            <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
            {subtitle && <p className="text-sm text-white/60">{subtitle}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
