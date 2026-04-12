"use client";

import { motion, AnimatePresence } from "framer-motion";
import { spring } from "@/lib/design/tokens";

interface NewPostsPillProps {
  count: number;
  onClick: () => void;
}

export function NewPostsPill({ count, onClick }: NewPostsPillProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={spring.pop}
          onClick={onClick}
          className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/30 backdrop-blur-sm active:scale-95"
        >
          {count}개 새 게시물
        </motion.button>
      )}
    </AnimatePresence>
  );
}
