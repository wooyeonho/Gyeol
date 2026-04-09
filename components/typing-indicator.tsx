"use client";

import { motion } from "framer-motion";

/**
 * KakaoTalk-style typing indicator — "결이 생각하는 중..."
 * Three dots with staggered bounce animation.
 */
export function TypingIndicator({ name }: { name?: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2" role="status" aria-label={`${name ?? "AI"} is thinking`}>
      <div className="flex items-center gap-1 rounded-2xl bg-white/[0.06] px-4 py-3">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="h-2 w-2 rounded-full bg-white/40"
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <span className="text-xs text-white/30">{name ?? "결"}이 생각하는 중...</span>
    </div>
  );
}
