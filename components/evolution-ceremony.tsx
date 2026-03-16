"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playSound, haptic } from "@/lib/micro-interactions";

interface EvolutionCeremonyProps {
  level: number;
  mutation?: string;
  onComplete: () => void;
}

const pseudo = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453123;
  return x - Math.floor(x);
};

export function EvolutionCeremony({ level, mutation, onComplete }: EvolutionCeremonyProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: (pseudo(i + 1) - 0.5) * 2,
        y: (pseudo(i + 91) - 0.5) * 2,
        delay: pseudo(i + 181) * 0.4,
        color: ["#fbbf24", "#f59e0b", "#f97316", "#ec4899", "#8b5cf6", "#06b6d4"][i % 6],
      })),
    [],
  );

  useEffect(() => {
    playSound("levelUp");
    haptic("success");
    const t = setTimeout(onComplete, 5000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
        role="alert"
        aria-live="assertive"
      >
        {/* Radial glow pulse */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at center, rgba(139,92,246,0.25), transparent 60%)",
          }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Confetti particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute w-2 h-2 rounded-full"
              style={{ left: "50%", top: "50%", backgroundColor: p.color }}
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{
                scale: [0, 1.2, 0],
                x: p.x * 350,
                y: p.y * 350,
              }}
              transition={{
                duration: 1.8,
                delay: p.delay + 0.5,
                ease: "easeOut",
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 1.3, 1], opacity: [0, 1, 1] }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="relative z-10 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="text-6xl font-bold text-white drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]"
          >
            Gen {level}
          </motion.div>
          {mutation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="mt-4 text-white/80 text-lg"
            >
              {mutation}
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="mt-6 text-sm text-white/50"
          >
            Evolution Complete
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
