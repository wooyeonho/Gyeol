"use client";

import { useState } from "react";
import { sortByHot, sortByNew, sortByTop, type ScoredPost } from "@/lib/social/vote-sort";

export type SortMode = "hot" | "new" | "top";

const TAB_CONFIG: { key: SortMode; label: { ko: string; en: string }; icon: string }[] = [
  { key: "hot", label: { ko: "인기", en: "Hot" }, icon: "🔥" },
  { key: "new", label: { ko: "최신", en: "New" }, icon: "🆕" },
  { key: "top", label: { ko: "상위", en: "Top" }, icon: "🏆" },
];

interface VoteSortTabsProps {
  activeSort?: SortMode;
  onSortChange?: (sort: SortMode) => void;
  locale?: string;
}

export function VoteSortTabs({
  activeSort = "hot",
  onSortChange,
  locale = "ko",
}: VoteSortTabsProps) {
  const isKo = locale === "ko" || locale.startsWith("ko-");
  const [active, setActive] = useState<SortMode>(activeSort);

  const handleChange = (mode: SortMode) => {
    setActive(mode);
    onSortChange?.(mode);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 backdrop-blur-xl p-2">
      <div className="flex gap-1">
        {TAB_CONFIG.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleChange(tab.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                isActive
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-white/50 hover:bg-white/[0.04] hover:text-white/70"
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span>{isKo ? tab.label.ko : tab.label.en}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Utility: sort a list of ScoredPost items by the chosen mode. */
export function applySortMode(
  posts: ScoredPost[],
  mode: SortMode,
  now: Date = new Date(),
): ScoredPost[] {
  switch (mode) {
    case "hot":
      return sortByHot(posts, now);
    case "new":
      return sortByNew(posts);
    case "top":
      return sortByTop(posts, "week", now);
  }
}
