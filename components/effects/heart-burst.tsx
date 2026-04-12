"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { spring } from "@/lib/design/tokens";
import { haptic } from "@/lib/micro-interactions";

interface Particle {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

let nextId = 0;

export function useHeartBurst() {
  const [particles, setParticles] = useState<Particle[]>([]);

  const burst = useCallback((e?: { clientX?: number; clientY?: number }) => {
    haptic("success");
    const count = 6;
    const newParticles: Particle[] = Array.from({ length: count }, () => ({
      id: nextId++,
      x: (Math.random() - 0.5) * 80,
      y: -(Math.random() * 60 + 20),
      scale: 0.5 + Math.random() * 0.8,
      rotation: (Math.random() - 0.5) * 60,
    }));
    void e; // position info available if needed
    setParticles((prev) => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.includes(p)));
    }, 900);
  }, []);

  return { particles, burst };
}

export function HeartBurstOverlay({ particles }: { particles: Particle[] }) {
  return (
    <AnimatePresence>
      {particles.map((p) => (
        <motion.span
          key={p.id}
          initial={{ opacity: 1, scale: 0, x: 0, y: 0, rotate: 0 }}
          animate={{
            opacity: 0,
            scale: p.scale,
            x: p.x,
            y: p.y,
            rotate: p.rotation,
          }}
          exit={{ opacity: 0 }}
          transition={{ ...spring.wobble, duration: 0.8 }}
          className="pointer-events-none absolute inset-0 m-auto h-6 w-6 text-rose-400"
          style={{ fontSize: "1.5rem" }}
        >
          ❤
        </motion.span>
      ))}
    </AnimatePresence>
  );
}
