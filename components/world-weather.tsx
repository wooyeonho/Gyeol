"use client";

import { motion } from "framer-motion";
import { useWorldStore } from "@/store/world-store";

export function WorldWeather() {
  const { worldState } = useWorldStore();
  const name = worldState?.weather?.name;

  if (!name) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.4 }}
      className="fixed top-14 left-1/2 -translate-x-1/2 z-10"
    >
      <div className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5">
        <span className="text-xs font-medium text-[var(--muted)]">{name}</span>
      </div>
    </motion.div>
  );
}
