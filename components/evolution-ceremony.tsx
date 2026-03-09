"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EvolutionCeremonyProps {
  level: number;
  mutation?: string;
  onComplete: () => void;
}

function Particle({ delay, x, y }: { delay: number; x: number; y: number }) {
  return (
    <motion.div
      className="absolute w-1 h-1 rounded-full bg-accent-light"
      initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        x: [0, x * 0.5, x],
        y: [0, y * 0.5, y],
        scale: [0, 1.5, 0],
      }}
      transition={{ duration: 2.5, delay, ease: "easeOut" }}
    />
  );
}

export function EvolutionCeremony({ level, mutation, onComplete }: EvolutionCeremonyProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, 5000);
    return () => clearTimeout(t);
  }, [onComplete]);

  const particles = useMemo(() => {
    function seed(n: number) {
      const x = Math.sin(n * 9301 + 49297) * 49297;
      return x - Math.floor(x);
    }
    return Array.from({ length: 30 }).map((_, i) => {
      const angle = (i / 30) * Math.PI * 2;
      const r = 80 + seed(i * 2 + 1) * 120;
      return {
        id: i,
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
        delay: 0.5 + seed(i * 2 + 2) * 0.8,
      };
    });
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center overflow-hidden"
      >
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 3, 5], opacity: [0, 0.15, 0] }}
            transition={{ duration: 3, ease: "easeOut", delay: 0.3 }}
            className="w-40 h-40 rounded-full bg-accent/30 blur-3xl"
          />
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 2, 3.5], opacity: [0, 0.2, 0] }}
            transition={{ duration: 2.5, ease: "easeOut", delay: 0.6 }}
            className="w-24 h-24 rounded-full border border-accent/30"
          />
        </div>

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {particles.map((p) => (
            <Particle key={p.id} delay={p.delay} x={p.x} y={p.y} />
          ))}
        </div>

        <motion.div className="text-center z-10 relative">
          <motion.div
            initial={{ scale: 0.5, opacity: 0, filter: "blur(10px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="text-sm font-medium text-accent-light/80 tracking-[0.3em] uppercase mb-3">
              Evolution
            </div>
            <div className="text-7xl font-bold text-white animate-text-glow">
              Gen {level}
            </div>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent mt-6 mx-auto w-48"
            />
          </motion.div>

          {mutation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.6 }}
              className="mt-6 text-white/60 text-base font-light tracking-wide"
            >
              {mutation}
            </motion.div>
          )}

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3.5 }}
            onClick={onComplete}
            className="mt-10 text-white/30 text-xs hover:text-white/50 transition-colors"
          >
            터치하여 계속
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
