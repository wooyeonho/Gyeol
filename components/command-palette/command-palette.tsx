"use client";

/**
 * Command Palette (⌘K).
 *
 * Inspired by Linear, Notion, Arc Browser, Raycast, Superhuman. Opens on
 * ⌘K / Ctrl+K, searches across navigation, actions, and AI intents. Keyboard
 * first — arrow keys, enter to run, escape to close.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  MessageCircle,
  Brain,
  Settings,
  Shield,
  Plus,
  Sparkles,
  Heart,
  Key,
  Lock,
  Compass,
  Gift,
  Star,
  Moon,
  Sun,
  Leaf,
} from "lucide-react";
import {
  searchCommands,
  type Command,
  type CommandIcon,
} from "@/lib/command-palette/registry";
import { haptic } from "@/lib/micro-interactions";

const ICONS: Record<CommandIcon, React.ReactNode> = {
  home: <Home className="h-4 w-4" />,
  chat: <MessageCircle className="h-4 w-4" />,
  memory: <Brain className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
  security: <Shield className="h-4 w-4" />,
  search: <Search className="h-4 w-4" />,
  plus: <Plus className="h-4 w-4" />,
  sparkles: <Sparkles className="h-4 w-4" />,
  heart: <Heart className="h-4 w-4" />,
  shield: <Shield className="h-4 w-4" />,
  leaf: <Leaf className="h-4 w-4" />,
  moon: <Moon className="h-4 w-4" />,
  sun: <Sun className="h-4 w-4" />,
  key: <Key className="h-4 w-4" />,
  lock: <Lock className="h-4 w-4" />,
  compass: <Compass className="h-4 w-4" />,
  gift: <Gift className="h-4 w-4" />,
  star: <Star className="h-4 w-4" />,
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();

  const results = useMemo(() => searchCommands(query).slice(0, 50), [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const runCommand = useCallback(
    (cmd: Command) => {
      haptic("tap");
      close();
      if (cmd.href) {
        router.push(cmd.href);
      } else if (cmd.perform) {
        void cmd.perform();
      }
    },
    [close, router],
  );

  // Global keyboard shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      // Next tick — wait for element to mount
      const t = setTimeout(() => inputRef.current?.focus(), 16);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Keep active index in range
  useEffect(() => {
    if (activeIndex >= results.length) {
      setActiveIndex(Math.max(0, results.length - 1));
    }
  }, [activeIndex, results.length]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-cmd-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  const grouped = results.reduce<Record<string, Command[]>>((acc, cmd) => {
    (acc[cmd.group] ||= []).push(cmd);
    return acc;
  }, {});
  const groupOrder = Object.keys(grouped);
  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 px-4 pt-[14vh] backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search bar */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
          <Search className="h-4 w-4 flex-shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search Gyeol — type to jump, ask, or act"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(results.length - 1, i + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const cmd = results[activeIndex];
                if (cmd) runCommand(cmd);
              }
            }}
          />
          <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-neutral-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <ul
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto py-2"
          role="listbox"
          aria-label="Command results"
        >
          {results.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-neutral-500">
              No matches for &ldquo;{query}&rdquo;. Try fewer words.
            </li>
          ) : (
            groupOrder.map((groupName) => (
              <li key={groupName}>
                <div className="px-4 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                  {groupName}
                </div>
                <ul>
                  {grouped[groupName].map((cmd) => {
                    const idx = flatIndex++;
                    const active = idx === activeIndex;
                    return (
                      <li
                        key={cmd.id}
                        data-cmd-index={idx}
                        role="option"
                        aria-selected={active}
                      >
                        <button
                          type="button"
                          onClick={() => runCommand(cmd)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                            active
                              ? "bg-indigo-500/15 text-white"
                              : "text-neutral-200 hover:bg-white/5"
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${
                              active
                                ? "bg-indigo-500/25 text-indigo-200"
                                : "bg-white/5 text-neutral-400"
                            }`}
                          >
                            {cmd.icon ? ICONS[cmd.icon] : <Sparkles className="h-4 w-4" />}
                          </span>
                          <span className="flex-1 truncate">{cmd.title}</span>
                          {cmd.shortcut && (
                            <span className="flex gap-1">
                              {cmd.shortcut.map((k, i) => (
                                <kbd
                                  key={i}
                                  className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-neutral-400"
                                >
                                  {k}
                                </kbd>
                              ))}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-black/30 px-4 py-2 text-[10px] text-neutral-500">
          <span>
            <kbd className="mx-0.5 rounded border border-white/10 bg-white/5 px-1">↑↓</kbd>
            navigate
            <kbd className="mx-0.5 ml-2 rounded border border-white/10 bg-white/5 px-1">↵</kbd>
            select
          </span>
          <span>⌘K to toggle</span>
        </div>
      </div>
    </div>
  );
}
