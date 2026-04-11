"use client";

import { AnimatePresence, motion } from "framer-motion";

interface LevelUpToastProps {
  level: number | null;
  onDismiss: () => void;
}

// 18 particles fanned out in a radial pattern. All deterministic so we
// never have to call Math.random() during render.
const PARTICLES = Array.from({ length: 18 }).map((_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const radius = 140 + (i % 3) * 30;
  return {
    dx: Math.cos(angle) * radius,
    dy: Math.sin(angle) * radius,
    duration: 1.4 + (i % 4) * 0.15,
    delay: (i % 6) * 0.04,
    hue: 200 + (i * 13) % 120,
  };
});

/**
 * Full-screen celebration banner for level-ups.
 * Triggered from any API response that returns `engagement.leveledUp = true`.
 */
export function LevelUpToast({ level, onDismiss }: LevelUpToastProps) {
  return (
    <AnimatePresence>
      {level !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.6, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="relative mx-4 max-w-sm rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-slate-900/95 via-indigo-900/80 to-fuchsia-900/70 p-8 text-center shadow-[0_0_80px_rgba(99,102,241,0.35)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
              {PARTICLES.map((p, i) => (
                <motion.span
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full"
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{ x: p.dx, y: p.dy, opacity: 0 }}
                  transition={{
                    duration: p.duration,
                    delay: p.delay,
                    repeat: Infinity,
                    repeatDelay: 1.2,
                  }}
                  style={{
                    left: "50%",
                    top: "50%",
                    background: `hsl(${p.hue}, 80%, 70%)`,
                  }}
                />
              ))}
            </div>

            <motion.p
              className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-200/80"
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              Level Up
            </motion.p>
            <motion.div
              className="mt-4 text-7xl font-black text-white"
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 280 }}
              style={{
                textShadow: "0 0 40px rgba(129, 140, 248, 0.8)",
              }}
            >
              {level}
            </motion.div>
            <motion.p
              className="mt-4 text-sm text-white/75"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              축하해요! 새로운 성장이 시작됐어요.
            </motion.p>
            <motion.button
              className="mt-6 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/15"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              type="button"
              onClick={onDismiss}
            >
              계속하기
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
