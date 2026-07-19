"use client";



import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Shows a banner when the user goes offline, auto-hides when back online */
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  // Register service worker for offline caching (unconditionally)
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failed — offline caching unavailable
      });
    }
  }, []);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => {
      setIsOffline(false);
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 3000);
    };

    // Check initial state
    if (!navigator.onLine) setIsOffline(true);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-0 inset-x-0 z-[200] flex items-center justify-center gap-2 bg-amber-500/90 py-2 text-xs font-medium text-black backdrop-blur-sm"
        >
          <span aria-hidden="true">📡</span>
          <span>오프라인 상태입니다. 일부 기능이 제한될 수 있어요.</span>
        </motion.div>
      )}
      {justReconnected && !isOffline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed top-0 inset-x-0 z-[200] flex items-center justify-center gap-2 bg-emerald-500/90 py-2 text-xs font-medium text-black backdrop-blur-sm"
        >
          <span aria-hidden="true">✅</span>
          <span>다시 연결되었습니다!</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
