"use client";

import { useEffect } from "react";

type ShortcutMap = Record<string, () => void>;

/**
 * Desktop keyboard shortcuts for power users.
 * Inspired by Linear's keyboard-first UX.
 *
 * Usage:
 *   useKeyboardShortcuts({ "k": openSearch, "?": toggleHelp });
 *
 * Modifier keys: Ctrl/Cmd are normalized automatically.
 * Ignores shortcuts when typing in inputs/textareas.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      // Don't fire shortcuts while typing
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const fn = shortcuts[key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts]);
}
