"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { haptic } from "@/lib/micro-interactions";

export type TabOption<T extends string = string> = {
  key: T;
  label: string;
};

/**
 * Shared tab bar with animated sliding indicator.
 * Optionally sticky so it stays visible during scroll on long pages
 * (leaderboard, social feed).
 */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  sticky = false,
}: {
  tabs: TabOption<T>[];
  active: T;
  onChange: (key: T) => void;
  /** When true, sticks to top on scroll (add pt offset to content below). */
  sticky?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    const el = tabRefs.current.get(active);
    if (!el || !containerRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const tab = el.getBoundingClientRect();
    setIndicator({
      left: tab.left - container.left,
      width: tab.width,
    });
  }, [active, tabs]);

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-wrap gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-1.5 ${
        sticky ? "sticky top-16 z-20 backdrop-blur-xl" : ""
      }`}
    >
      {/* Sliding indicator */}
      {indicator.width > 0 && (
        <motion.div
          className="absolute top-1.5 h-[calc(100%-12px)] rounded-xl border border-cyan-300/25 bg-cyan-400/12"
          initial={false}
          animate={{ left: indicator.left, width: indicator.width }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}

      {tabs.map((tab) => (
        <button
          key={tab.key}
          ref={(el) => {
            if (el) tabRefs.current.set(tab.key, el);
          }}
          type="button"
          onClick={() => {
            haptic("tap");
            onChange(tab.key);
          }}
          className={`relative z-10 rounded-xl px-4 py-2 text-sm font-medium transition-colors active:scale-[0.97] ${
            active === tab.key
              ? "text-cyan-100"
              : "text-white/50 hover:text-white/75"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
