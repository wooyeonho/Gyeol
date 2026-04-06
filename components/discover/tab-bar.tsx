"use client";

import { haptic } from "@/lib/micro-interactions";

export type TabOption<T extends string = string> = {
  key: T;
  label: string;
};

/**
 * Shared tab bar for discover section pages (leaderboard, social, market).
 * Provides one visual pattern so users don't see three different tab styles.
 */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: TabOption<T>[];
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => {
            haptic("tap");
            onChange(tab.key);
          }}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
            active === tab.key
              ? "border border-cyan-300/30 bg-cyan-400/15 text-cyan-100"
              : "border border-white/[0.06] bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white/80"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
