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
        className="fixed inset-0 z-30 bg-black flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: [1, 3, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3.5, ease: "easeInOut" }}
          className="text-center"
        >
          <div className="text-5xl font-bold text-white">Gen {level}</div>
          {mutation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-4 text-white/80 text-lg"
            >
              {mutation}
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
