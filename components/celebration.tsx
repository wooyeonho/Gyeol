"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type CelebrationProps = {
  visible: boolean;
  onEnd?: () => void;
  title?: string;
  subtitle?: string;
  durationMs?: number;
};

export default function Celebration({ visible, onEnd, title = "Celebration", subtitle, durationMs = 3500 }: CelebrationProps) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number; color: string }[]>([]);

  useEffect(() => {
    if (!visible) return;
    setParticles(
      Array.from({ length: 80 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        delay: Math.random() * 0.3,
        color: ["#fbbf24", "#f59e0b", "#f97316", "#ec4899", "#8b5cf6", "#06b6d4"][i % 6],
      }))
    );
    const t = setTimeout(() => {
      onEnd?.();
    }, durationMs);
    return () => clearTimeout(t);
  }, [visible, onEnd, durationMs]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="absolute inset-0 overflow-hidden">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute w-2 h-2 rounded-full"
                style={{ left: "50%", top: "50%", backgroundColor: p.color }}
                initial={{ scale: 0, x: 0, y: 0 }}
                animate={{
                  scale: [0, 1.2, 0],
                  x: p.x * 400,
                  y: p.y * 400,
                }}
                transition={{
                  duration: 1.5,
                  delay: p.delay,
                  ease: "easeOut",
                }}
              />
            ))}
          </div>
          <motion.div
            className="relative z-10 text-center"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <p className="text-2xl font-bold text-white drop-shadow-lg">{title}</p>
            {subtitle && <p className="mt-2 text-white/80 text-sm">{subtitle}</p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
