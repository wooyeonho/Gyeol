"use client";

import { useEffect, useCallback } from "react";

/* ── Shortcut definitions ── */

export interface ShortcutDef {
  /** Unique action name used as handler key */
  action: string;
  /** Display key label (for help overlay) */
  key: string;
  /** Description in Korean */
  descriptionKo: string;
  /** Description in English */
  descriptionEn: string;
  /** Whether the shortcut requires Cmd/Ctrl modifier */
  modifier?: boolean;
}

export const SHORTCUTS: ShortcutDef[] = [
  {
    action: "openSearch",
    key: "K",
    descriptionKo: "검색 열기",
    descriptionEn: "Open search",
    modifier: true,
  },
  {
    action: "focusChatInput",
    key: "/",
    descriptionKo: "채팅 입력 포커스",
    descriptionEn: "Focus chat input",
    modifier: true,
  },
  {
    action: "scrollDown",
    key: "J",
    descriptionKo: "피드 아래로 이동",
    descriptionEn: "Scroll down feed",
  },
  {
    action: "scrollUp",
    key: "K",
    descriptionKo: "피드 위로 이동",
    descriptionEn: "Scroll up feed",
  },
  {
    action: "closeOverlay",
    key: "Escape",
    descriptionKo: "모달/오버레이 닫기",
    descriptionEn: "Close modal/overlay",
  },
  {
    action: "tab1",
    key: "1",
    descriptionKo: "탭 1로 전환",
    descriptionEn: "Switch to tab 1",
  },
  {
    action: "tab2",
    key: "2",
    descriptionKo: "탭 2로 전환",
    descriptionEn: "Switch to tab 2",
  },
  {
    action: "tab3",
    key: "3",
    descriptionKo: "탭 3로 전환",
    descriptionEn: "Switch to tab 3",
  },
  {
    action: "tab4",
    key: "4",
    descriptionKo: "탭 4로 전환",
    descriptionEn: "Switch to tab 4",
  },
  {
    action: "tab5",
    key: "5",
    descriptionKo: "탭 5로 전환",
    descriptionEn: "Switch to tab 5",
  },
  {
    action: "showHelp",
    key: "?",
    descriptionKo: "키보드 단축키 도움말",
    descriptionEn: "Keyboard shortcut help",
  },
];

/* ── Helper: is the user typing in an input? ── */

function isInputFocused(e: KeyboardEvent): boolean {
  const target = e.target as HTMLElement | null;
  if (!target) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/* ── Hook ── */

/**
 * Registers keyboard shortcut event listeners.
 *
 * `handlers` is a map of action names (from SHORTCUTS) to callbacks.
 * Modifier shortcuts (Cmd/Ctrl+key) work even when an input is focused.
 * Non-modifier shortcuts are suppressed when typing.
 *
 * @example
 * useKeyboardShortcuts({
 *   openSearch: () => searchModal.open(),
 *   showHelp: () => setHelpOpen(true),
 *   tab1: () => router.push("/"),
 * });
 */
export function useKeyboardShortcuts(
  handlers: Record<string, () => void>,
) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key;
      const hasModifier = e.metaKey || e.ctrlKey;
      const typing = isInputFocused(e);

      // --- Modifier shortcuts (Cmd/Ctrl + key) ---
      if (hasModifier) {
        const lower = key.toLowerCase();

        if (lower === "k" && handlers.openSearch) {
          e.preventDefault();
          handlers.openSearch();
          return;
        }

        if (lower === "/" && handlers.focusChatInput) {
          e.preventDefault();
          handlers.focusChatInput();
          return;
        }
      }

      // --- Escape always works (even in inputs) ---
      if (key === "Escape" && handlers.closeOverlay) {
        e.preventDefault();
        handlers.closeOverlay();
        return;
      }

      // --- Everything below: skip if user is typing ---
      if (typing) return;

      // J / K for feed scrolling
      if (key === "j" && handlers.scrollDown) {
        e.preventDefault();
        handlers.scrollDown();
        return;
      }
      if (key === "k" && !hasModifier && handlers.scrollUp) {
        e.preventDefault();
        handlers.scrollUp();
        return;
      }

      // Number keys 1-5 for tab switching
      const tabMap: Record<string, string> = {
        "1": "tab1",
        "2": "tab2",
        "3": "tab3",
        "4": "tab4",
        "5": "tab5",
      };
      const tabAction = tabMap[key];
      if (tabAction && handlers[tabAction]) {
        e.preventDefault();
        handlers[tabAction]();
        return;
      }

      // ? for help overlay
      if (key === "?" && handlers.showHelp) {
        e.preventDefault();
        handlers.showHelp();
        return;
      }
    },
    [handlers],
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
