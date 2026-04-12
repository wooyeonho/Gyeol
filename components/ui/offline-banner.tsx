"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { spring, layer } from "@/lib/design/tokens";
import { useTranslations } from "@/components/i18n-provider";

/**
 * Enhanced offline banner with i18n support, reconnection toast,
 * and pending actions count indicator.
 *
 * Complements the existing `offline-indicator.tsx` which only handles
 * Korean locale. This component uses the full i18n system and integrates
 * with Spring animation tokens.
 */
export function OfflineBanner() {
  const { locale } = useTranslations();
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== "undefined" && !navigator.onLine,
  );
  const [showReconnected, setShowReconnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    // Check for pending offline queue items
    function checkPending() {
      try {
        const raw = localStorage.getItem("gyeol-offline-queue");
        if (raw) {
          const arr = JSON.parse(raw);
          setPendingCount(Array.isArray(arr) ? arr.length : 0);
        } else {
          setPendingCount(0);
        }
      } catch {
        setPendingCount(0);
      }
    }
    checkPending();
    const interval = setInterval(checkPending, 5000);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      clearInterval(interval);
    };
  }, []);

  const offlineText: Record<string, string> = {
    ko: "오프라인 상태입니다",
    en: "You are offline",
    ja: "オフラインです",
    zh: "您已离线",
    es: "Estás sin conexión",
  };

  const reconnectedText: Record<string, string> = {
    ko: "다시 연결되었습니다!",
    en: "Back online!",
    ja: "再接続しました！",
    zh: "已重新连接！",
    es: "¡Reconectado!",
  };

  const pendingText: Record<string, string> = {
    ko: `${pendingCount}개 대기 중`,
    en: `${pendingCount} pending`,
    ja: `${pendingCount}件保留中`,
    zh: `${pendingCount}个待处理`,
    es: `${pendingCount} pendientes`,
  };

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={spring.pop}
          className="fixed top-0 inset-x-0 flex items-center justify-center gap-2 bg-amber-500/90 py-2 text-xs font-medium text-black backdrop-blur-sm"
          style={{ zIndex: layer.toast + 10 }}
        >
          <span aria-hidden="true">{"\uD83D\uDCE1"}</span>
          <span>{offlineText[locale] ?? offlineText.en}</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px]">
              {pendingText[locale] ?? pendingText.en}
            </span>
          )}
        </motion.div>
      )}
      {showReconnected && !isOffline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={spring.pop}
          className="fixed top-0 inset-x-0 flex items-center justify-center gap-2 bg-emerald-500/90 py-2 text-xs font-medium text-black backdrop-blur-sm"
          style={{ zIndex: layer.toast + 10 }}
        >
          <span aria-hidden="true">{"\u2714\uFE0F"}</span>
          <span>{reconnectedText[locale] ?? reconnectedText.en}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
