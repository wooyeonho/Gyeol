"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.08 },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/**
 * Shared page shell for all discover section pages.
 * Provides consistent background, padding, max-width, BottomNav,
 * and a staggered entrance animation for child elements.
 *
 * Wrap each direct child section in <motion.div variants={itemVariants}>
 * for the stagger effect.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="theme-page min-h-screen px-4 pb-24 pt-20">
      <motion.div
        className="mx-auto max-w-5xl space-y-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {children}
      </motion.div>
      <BottomNav />
    </div>
  );
}
