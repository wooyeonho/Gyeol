"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface EvolutionCeremonyProps {
  level: number;
  mutation?: string;
  onComplete: () => void;
}

export function EvolutionCeremony({ level, mutation, onComplete }: EvolutionCeremonyProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, 3500);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        className="fixed inset-0 z-30 flex items-center justify-center bg-[var(--background)]"
      >
        <div className="gradient-void absolute inset-0" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative text-center"
        >
          <motion.div
            initial={{ scale: 1, opacity: 0.9 }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 3.5, ease: "easeInOut" }}
            className="font-display text-5xl font-bold tracking-tight text-[var(--foreground)]"
          >
            Gen {level}
          </motion.div>
          {mutation && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              className="mt-4 text-[var(--muted-strong)] text-lg font-medium"
            >
              {mutation}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
