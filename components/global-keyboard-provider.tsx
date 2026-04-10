"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useKeyboardShortcuts, SHORTCUTS } from "@/lib/keyboard-shortcuts";
import { useSearchModal } from "@/components/search-modal";

const SearchModal = dynamic(() => import("@/components/search-modal").then((m) => ({ default: m.SearchModal })), {
  ssr: false,
  loading: () => null,
});
const KeyboardShortcutHelp = dynamic(() => import("@/components/keyboard-shortcut-help").then((m) => ({ default: m.KeyboardShortcutHelp })), {
  ssr: false,
  loading: () => null,
});

/**
 * Global keyboard shortcut provider.
 *
 * Renders the SearchModal and KeyboardShortcutHelp overlays and wires all
 * global shortcuts (Cmd/Ctrl+K, Escape, J/K, Space, ?) into a single
 * `useKeyboardShortcuts` call.
 *
 * Drop into the root layout (as a client component) to activate shortcuts
 * app-wide.
 */
export function GlobalKeyboardProvider() {
  const searchModal = useSearchModal();

  // Feed navigation: dispatch custom events so any feed component can listen
  const dispatchFeedEvent = useCallback((type: string) => {
    window.dispatchEvent(new CustomEvent("gyeol:keyboard", { detail: { action: type } }));
  }, []);

  const handlers: Record<string, () => void> = {
    openSearch: searchModal.toggle,
    closeOverlay: () => {
      // Close search if open, otherwise let KeyboardShortcutHelp handle it
      if (searchModal.isOpen) {
        searchModal.close();
      }
    },
    scrollDown: () => dispatchFeedEvent("scrollDown"),
    scrollUp: () => dispatchFeedEvent("scrollUp"),
    toggleReaction: () => dispatchFeedEvent("toggleReaction"),
  };

  useKeyboardShortcuts(handlers);

  return (
    <>
      <SearchModal isOpen={searchModal.isOpen} onClose={searchModal.close} />
      <KeyboardShortcutHelp />
    </>
  );
}
