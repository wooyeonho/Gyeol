"use client";

import { motion } from "framer-motion";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6">
      <div className="gradient-void absolute inset-0" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative text-center max-w-sm"
      >
        <p className="text-lg font-medium text-[var(--foreground)]">문제가 발생했어요</p>
        <p className="mt-2 text-sm text-[var(--muted)]">
          일시적인 오류일 수 있어요. 다시 시도해 주세요.
        </p>
        <motion.button
          onClick={reset}
          whileTap={{ scale: 0.98 }}
          className="mt-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          재시도
        </motion.button>
      </motion.div>
    </div>
  );
}
