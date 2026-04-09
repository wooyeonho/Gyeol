"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SHORTCUTS, type ShortcutDef } from "@/lib/keyboard-shortcuts";
import { FocusTrap } from "@/components/focus-trap";

/* ── Helper: format display key ── */

function formatKey(shortcut: ShortcutDef): string {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const mod = isMac ? "⌘" : "Ctrl";

  if (shortcut.modifier) {
    return `${mod}+${shortcut.key}`;
  }
  return shortcut.key;
}

/* ── Overlay animations ── */

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, damping: 28, stiffness: 320 },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.97,
    transition: { duration: 0.12 },
  },
};

/* ── Component ── */

export function KeyboardShortcutHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  // Open with "?" key, close with Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Don't fire when typing
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsOpen((v) => !v);
        return;
      }

      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen && (
        <FocusTrap active onEscape={close}>
        <motion.div
          className="fixed inset-0 z-[110] flex items-center justify-center px-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c14] shadow-2xl"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-label="Keyboard shortcuts"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <h2 className="text-sm font-bold text-white">
                키보드 단축키
              </h2>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
                aria-label="Close"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Table */}
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <table className="w-full">
                <tbody>
                  {SHORTCUTS.map((shortcut) => (
                    <tr
                      key={shortcut.action}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="py-2.5 pr-4">
                        <kbd className="inline-flex items-center gap-0.5 rounded-md border border-white/15 bg-white/5 px-2 py-1 font-mono text-xs font-medium text-white/60">
                          {formatKey(shortcut)}
                        </kbd>
                      </td>
                      <td className="py-2.5">
                        <p className="text-sm text-white/80">
                          {shortcut.descriptionKo}
                        </p>
                        <p className="text-xs text-white/30">
                          {shortcut.descriptionEn}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="border-t border-white/10 px-5 py-2.5 text-center">
              <p className="text-[10px] text-white/20">
                <kbd className="rounded border border-white/15 bg-white/5 px-1 py-0.5 text-[10px]">
                  ?
                </kbd>
                {" "}키를 다시 누르면 닫힙니다
              </p>
            </div>
          </motion.div>
        </motion.div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}
