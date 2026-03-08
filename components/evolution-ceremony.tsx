"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type EvolutionCeremonyProps = {
  level: number;
  mutation?: string | null;
  onComplete: () => void;
};

const DURATION_MS = 3500;

export default function EvolutionCeremony({ level, mutation, onComplete }: EvolutionCeremonyProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, DURATION_MS);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="text-center"
            initial={{ scale: 1, opacity: 0.8 }}
            animate={{ scale: [1, 2.5, 1.5], opacity: 1 }}
            transition={{ duration: 1.2, times: [0, 0.5, 1] }}
          >
            <motion.div
              className="w-32 h-32 rounded-full bg-amber-400/30 border-2 border-amber-400"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 3, 1.5] }}
              transition={{ duration: 1, times: [0, 0.4, 1] }}
            />
            <motion.p
              className="mt-6 text-3xl font-bold text-amber-400"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Gen {level}
            </motion.p>
            {mutation && (
              <motion.p
                className="mt-2 text-sm text-white/70"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                Mutation: {mutation}
              </motion.p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
