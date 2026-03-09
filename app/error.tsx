"use client";

import { motion } from "framer-motion";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-dvh bg-black text-white flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center max-w-sm"
      >
        <div className="w-20 h-20 rounded-full bg-red-500/10 mx-auto mb-6 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-1">문제가 발생했어요</h2>
        <p className="text-sm text-white/40 mb-8">잠시 후 다시 시도해 주세요</p>
        <button
          onClick={reset}
          className="px-8 py-3 rounded-xl gradient-accent text-white text-sm font-medium transition-all duration-200 hover:opacity-90 active:scale-[0.98] shadow-lg shadow-accent/20"
        >
          다시 시도
        </button>
      </motion.div>
    </div>
  );
}
