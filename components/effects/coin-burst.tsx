"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";

const PARTICLE_COUNT = 12;

// Deterministic particle ring — each particle offset is computed from
// its index so we never hit the `react-hooks/purity` lint rule that
// bans Math.random() inside render.
const PARTICLES = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
  return {
    id: i,
    dx: Math.cos(angle) * 90,
    dy: Math.sin(angle) * 90 - 30,
    delay: (i % 4) * 0.03,
  };
});

/**
 * Phase 4-2: Global coin-burst particle layer.
 *
 * Subscribes to the Zustand `agentState.coins` slot and fires a short
 * burst whenever the balance increases. Mounted once at layout level
 * so every coin gain anywhere in the app is accompanied by visible
 * positive feedback — one of the highest-leverage microinteractions
 * from the strategy doc.
 *
 * The component is pointer-events-none, so it never blocks input
 * underneath even while animating.
 */
export function CoinBurstHost() {
  const coins = useAgentStore(
    (s) =>
      (s.agentState as { coins?: number } | null)?.coins ?? null,
  );
  // Track previous coin balance in a ref so the effect body only reads,
  // never writes to state directly (which would trip
  // react-hooks/set-state-in-effect). Visible state updates are deferred
  // to a microtask so React can batch them before paint.
  const prevRef = useRef<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const [delta, setDelta] = useState(0);

  useEffect(() => {
    if (coins == null) return;
    const prev = prevRef.current;
    if (prev == null) {
      prevRef.current = coins;
      return;
    }
    if (coins > prev) {
      const diff = coins - prev;
      queueMicrotask(() => {
        setDelta(diff);
        setNonce((n) => n + 1);
      });
    }
    prevRef.current = coins;
  }, [coins]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
      <AnimatePresence>
        {nonce > 0 && (
          <motion.div
            key={nonce}
            className="relative h-0 w-0"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.span
              className="absolute -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-amber-300"
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: -40, scale: 1 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              +{delta} 🪙
            </motion.span>
            {PARTICLES.map((p) => (
              <motion.span
                key={p.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 text-lg"
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: p.dx,
                  y: p.dy,
                  scale: [0.4, 1.1, 1, 0.6],
                }}
                transition={{
                  duration: 1.05,
                  delay: p.delay,
                  ease: [0.22, 1, 0.36, 1],
                }}
                onAnimationComplete={
                  p.id === PARTICLE_COUNT - 1
                    ? () =>
                        setTimeout(() => {
                          // Let the layer quiesce between bursts so
                          // back-to-back coin gains still re-animate.
                          setNonce(0);
                        }, 50)
                    : undefined
                }
              >
                🪙
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
