"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useKeyboardShortcuts } from "@/lib/keyboard-shortcuts";
import { useSearchModal } from "@/components/search-modal";
import { SHORTCUTS as WORLD_CLASS_SHORTCUTS } from "@/lib/features/world-class-patterns";

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
  const router = useRouter();

  // Linear/Vim-style "g <letter>" navigation chord.
  // Mirrors the `nav.home / nav.room / nav.memories / nav.journey` entries in
  // the world-class SHORTCUTS registry — press `g` then the target letter
  // within 1.2s to jump.
  useEffect(() => {
    let gPressedAt = 0;
    const routes: Record<string, string> = {
      h: "/",
      r: "/room",
      m: "/memories",
      j: "/journey",
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const now = Date.now();
      if (e.key === "g") {
        gPressedAt = now;
        return;
      }
      if (now - gPressedAt < 1200) {
        const dest = routes[e.key.toLowerCase()];
        if (dest) {
          e.preventDefault();
          router.push(dest);
          gPressedAt = 0;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  // Reference the catalog so tree-shaking doesn't drop it and the help
  // overlay can iterate through the world-class registry if needed.
  void WORLD_CLASS_SHORTCUTS;

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
