"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/* ── Hook: useSearchModal ── */

export function useSearchModal() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  return { isOpen, open, close, toggle };
}

/* ── Static page definitions ── */

interface SearchResult {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  category: "pages" | "chat" | "creatures" | "social";
}

const STATIC_PAGES: SearchResult[] = [
  { id: "home", icon: "🏠", title: "Home", subtitle: "홈 화면", href: "/", category: "pages" },
  { id: "chat", icon: "💬", title: "Chat", subtitle: "AI 채팅", href: "/chat", category: "pages" },
  { id: "dna", icon: "🧬", title: "DNA", subtitle: "DNA 편집", href: "/dna", category: "pages" },
  { id: "care", icon: "🩺", title: "Care", subtitle: "생명체 돌보기", href: "/care", category: "pages" },
  { id: "settings", icon: "⚙️", title: "Settings", subtitle: "설정", href: "/settings", category: "pages" },
  { id: "discover", icon: "🔍", title: "Discover", subtitle: "탐색", href: "/discover", category: "pages" },
  { id: "social", icon: "👥", title: "Social", subtitle: "소셜", href: "/social", category: "pages" },
  { id: "gacha", icon: "🎰", title: "Gacha", subtitle: "가챠/뽑기", href: "/market", category: "pages" },
];

const CATEGORIES = [
  { key: "pages" as const, label: "Pages" },
  { key: "chat" as const, label: "Chat History" },
  { key: "creatures" as const, label: "Creatures" },
  { key: "social" as const, label: "Social" },
];

/* ── Animations ── */

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 25, stiffness: 300 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: { duration: 0.15 },
  },
};

/* ── Inner content (remounts on each open so state resets) ── */

function SearchModalContent({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Auto-focus on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, []);

  // Filter results based on query
  const filteredPages = useMemo(() => {
    if (!query.trim()) return STATIC_PAGES;
    const q = query.toLowerCase();
    return STATIC_PAGES.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q),
    );
  }, [query]);

  // Group results by category
  const groupedResults = useMemo(() => {
    const groups: { category: (typeof CATEGORIES)[number]; items: SearchResult[] }[] = [];

    for (const cat of CATEGORIES) {
      if (cat.key === "pages") {
        if (filteredPages.length > 0) {
          groups.push({ category: cat, items: filteredPages });
        }
      } else {
        // Placeholder categories — will be connected to API later
        groups.push({ category: cat, items: [] });
      }
    }
    return groups;
  }, [filteredPages]);

  // Flat list of all results for keyboard navigation
  const flatResults = useMemo(
    () => groupedResults.flatMap((g) => g.items),
    [groupedResults],
  );

  // Clamp selectedIndex within bounds via derived value
  const clampedIndex = Math.min(
    selectedIndex,
    Math.max(flatResults.length - 1, 0),
  );

  const navigateTo = useCallback(
    (result: SearchResult) => {
      onClose();
      router.push(result.href);
    },
    [onClose, router],
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatResults.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        return;
      }

      if (e.key === "Enter" && flatResults[clampedIndex]) {
        e.preventDefault();
        navigateTo(flatResults[clampedIndex]);
        return;
      }
    },
    [flatResults, clampedIndex, onClose, navigateTo],
  );

  return (
    <motion.div
      className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c14] shadow-2xl"
      variants={panelVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onKeyDown={handleKeyDown}
    >
      {/* Search input */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <svg
          className="h-5 w-5 shrink-0 text-white/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
          }}
          placeholder="검색어를 입력하세요..."
          className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
          aria-label="Search"
        />
        <kbd className="hidden shrink-0 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/40 sm:inline-block">
          ESC
        </kbd>
      </div>

      {/* Results */}
      <div className="max-h-[50vh] overflow-y-auto overscroll-contain p-2">
        {groupedResults.map((group) => (
          <div key={group.category.key} className="mb-2 last:mb-0">
            {/* Category header */}
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/30">
              {group.category.label}
            </p>

            {group.items.length === 0 ? (
              <p className="px-3 py-2 text-xs text-white/20">
                검색 결과 없음
              </p>
            ) : (
              group.items.map((result) => {
                const globalIdx = flatResults.indexOf(result);
                const isSelected = globalIdx === clampedIndex;

                return (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => navigateTo(result)}
                    onMouseEnter={() => setSelectedIndex(globalIdx)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-base">
                      {result.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {result.title}
                      </p>
                      <p className="truncate text-xs text-white/40">
                        {result.subtitle}
                      </p>
                    </div>
                    {isSelected && (
                      <kbd className="shrink-0 rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-white/30">
                        ↵
                      </kbd>
                    )}
                  </button>
                );
              })
            )}
          </div>
        ))}

        {filteredPages.length === 0 && query.trim() && (
          <div className="py-8 text-center">
            <p className="text-sm text-white/30">
              &ldquo;{query}&rdquo;에 대한 검색 결과 없음
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/10 px-4 py-2">
        <div className="flex items-center gap-2 text-[10px] text-white/25">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-white/15 bg-white/5 px-1 py-0.5">↑</kbd>
            <kbd className="rounded border border-white/15 bg-white/5 px-1 py-0.5">↓</kbd>
            이동
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-white/15 bg-white/5 px-1 py-0.5">↵</kbd>
            선택
          </span>
        </div>
        <p className="text-[10px] text-white/20">Gyeol Search</p>
      </div>
    </motion.div>
  );
}

/* ── Outer wrapper (handles AnimatePresence) ── */

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Content remounts on each open → state resets naturally */}
          <SearchModalContent onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
