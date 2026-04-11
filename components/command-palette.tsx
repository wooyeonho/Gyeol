"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Command {
  id: string;
  icon: string;
  label: string;
  shortcut?: string;
  action: () => void;
  group: string;
}

interface CommandPaletteProps {
  locale?: string;
  onThemeToggle?: () => void;
}

/**
 * Cmd+K / Ctrl+K command palette — Notion/Linear/Discord style.
 */
export function CommandPalette({ locale = "ko", onThemeToggle }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const isKo = locale === "ko";

  const COMMANDS: Command[] = [
    // Navigation
    { id: "nav-home",         icon: "🏠", label: isKo ? "홈으로"       : "Home",           action: () => router.push("/"),            group: isKo ? "이동" : "Navigate" },
    { id: "nav-chat",         icon: "💬", label: isKo ? "대화하기"     : "Chat",            action: () => router.push("/"),            group: isKo ? "이동" : "Navigate" },
    { id: "nav-room",         icon: "🏡", label: isKo ? "크리처 룸"    : "Creature Room",   action: () => router.push("/room"),            group: isKo ? "이동" : "Navigate" },
    { id: "nav-memories",     icon: "⭐", label: isKo ? "메모리 타임라인" : "Memories",    action: () => router.push("/memories"),        group: isKo ? "이동" : "Navigate" },
    { id: "nav-constellation",icon: "🌌", label: isKo ? "별자리"        : "Constellation",  action: () => router.push("/constellation"),   group: isKo ? "이동" : "Navigate" },
    { id: "nav-market",       icon: "🛒", label: isKo ? "마켓"          : "Market",         action: () => router.push("/market"),          group: isKo ? "이동" : "Navigate" },
    { id: "nav-leaderboard",  icon: "🏆", label: isKo ? "리더보드"      : "Leaderboard",    action: () => router.push("/leaderboard"),     group: isKo ? "이동" : "Navigate" },
    { id: "nav-wrapped",      icon: "🎁", label: isKo ? "연간 요약"     : "Wrapped",        action: () => router.push("/wrapped"),         group: isKo ? "이동" : "Navigate" },
    { id: "nav-wellness",     icon: "💚", label: isKo ? "웰니스"        : "Wellness",       action: () => router.push("/wellness"),        group: isKo ? "이동" : "Navigate" },
    { id: "nav-feed",         icon: "📰", label: isKo ? "피드"          : "Feed",           action: () => router.push("/feed"),            group: isKo ? "이동" : "Navigate" },
    { id: "nav-ar",           icon: "📱", label: isKo ? "AR 모드"       : "AR Mode",        action: () => router.push("/ar"),              group: isKo ? "이동" : "Navigate" },
    { id: "nav-gacha",        icon: "🎰", label: isKo ? "가챠"          : "Gacha",          action: () => router.push("/gacha"),           group: isKo ? "이동" : "Navigate" },
    { id: "nav-profile",      icon: "👤", label: isKo ? "프로필"        : "Profile",        action: () => router.push("/profile"),         group: isKo ? "이동" : "Navigate" },
    { id: "nav-settings",     icon: "⚙️", label: isKo ? "설정"          : "Settings",       action: () => router.push("/settings"),        group: isKo ? "이동" : "Navigate" },
    // Actions
    { id: "toggle-theme",     icon: "🎨", label: isKo ? "테마 전환"     : "Toggle Theme",   action: () => { onThemeToggle?.(); setOpen(false); }, group: isKo ? "액션" : "Actions", shortcut: "T" },
  ];

  const filtered = query.trim()
    ? COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS;

  // Group commands
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.group] ??= []).push(cmd);
    return acc;
  }, {});

  // Keyboard listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery("");
        setActiveIndex(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Arrow key navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[activeIndex];
      if (cmd) { cmd.action(); setOpen(false); }
    }
  }, [filtered, activeIndex]);

  let flatIndex = 0;

  return (
    <>
      {/* Trigger hint (optional small button) */}
      <button
        className="hidden md:flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/30 hover:bg-white/[0.08] hover:text-white/50 transition-colors"
        onClick={() => setOpen(true)}
        aria-label={isKo ? "명령 팔레트 열기" : "Open command palette"}
      >
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>{isKo ? "검색..." : "Search..."}</span>
        <kbd className="ml-1 rounded bg-white/10 px-1 text-[10px]">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f14] shadow-2xl"
              initial={{ scale: 0.97, y: -8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.97, y: -8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
                <svg className="h-4 w-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  ref={inputRef}
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
                  placeholder={isKo ? "페이지 이동, 액션 검색..." : "Navigate, search actions..."}
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                  onKeyDown={handleKeyDown}
                  aria-label={isKo ? "명령 검색" : "Search commands"}
                />
                <kbd className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-white/30">ESC</kbd>
              </div>

              {/* Command list */}
              <div className="max-h-80 overflow-y-auto py-2">
                {Object.entries(grouped).map(([group, cmds]) => (
                  <div key={group}>
                    <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                      {group}
                    </div>
                    {cmds.map((cmd) => {
                      const isActive = flatIndex === activeIndex;
                      const currentIndex = flatIndex++;
                      return (
                        <button
                          key={cmd.id}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            isActive ? "bg-white/8 text-white" : "text-white/60 hover:bg-white/[0.04] hover:text-white/80"
                          }`}
                          onClick={() => { cmd.action(); setOpen(false); }}
                          onMouseEnter={() => setActiveIndex(currentIndex)}
                        >
                          <span className="text-base">{cmd.icon}</span>
                          <span className="flex-1 text-left">{cmd.label}</span>
                          {cmd.shortcut && (
                            <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/30">
                              {cmd.shortcut}
                            </kbd>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {filtered.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-white/30">
                    {isKo ? "결과 없음" : "No results"}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
