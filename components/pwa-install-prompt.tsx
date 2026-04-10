"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/micro-interactions";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-install-dismissed";
const DISMISSED_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Custom PWA install prompt that replaces the browser's default banner.
 *
 * Listens for `beforeinstallprompt`, stores the event, then shows a
 * branded card once the user has been active for 30 seconds.
 *
 * Respects a 7-day dismissal TTL (doesn't nag immediately after dismiss).
 *
 * Place once in the root layout:
 *   <PwaInstallPrompt />
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show in browser, not in standalone PWA
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if ((window.navigator as Navigator & { standalone?: boolean }).standalone) return; // iOS Safari standalone

    // Check dismissal TTL
    try {
      const dismissed = localStorage.getItem(DISMISSED_KEY);
      if (dismissed) {
        const ts = parseInt(dismissed, 10);
        if (Date.now() - ts < DISMISSED_TTL_MS) return;
      }
    } catch { /* ignore storage errors */ }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show prompt after 30s of user activity (not immediately)
      const timer = setTimeout(() => setVisible(true), 30_000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    haptic("success");
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    haptic("tap");
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch { /* ignore */ }
  };

  if (!deferredPrompt) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-label="Gyeol 앱 설치"
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-20 inset-x-4 z-40 mx-auto max-w-sm rounded-2xl border border-white/10 bg-neutral-900/95 p-4 shadow-2xl backdrop-blur-lg"
        >
          <div className="flex items-start gap-3">
            {/* App icon */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl shadow-lg">
              ✨
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Gyeol 홈 화면에 추가</p>
              <p className="mt-0.5 text-xs text-white/55 leading-relaxed">
                빠른 접근, 오프라인 지원, 전체 화면 경험
              </p>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="설치 안내 닫기"
              className="shrink-0 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white/70 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 rounded-full border border-white/15 py-2.5 text-xs font-medium text-white/60 hover:bg-white/5 transition-colors"
            >
              나중에
            </button>
            <button
              type="button"
              onClick={handleInstall}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90 active:scale-98"
            >
              <Download className="h-3.5 w-3.5" />
              설치하기
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
