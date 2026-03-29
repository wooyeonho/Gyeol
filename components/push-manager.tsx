"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAgentStore } from "@/store/agent-store";
import { useTranslations } from "@/components/i18n-provider";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const PUSH_DISMISSED_KEY = "gyeol_push_dismissed";
const PUSH_PROMPT_DELAY_MS = 8000; // Show prompt 8s after load

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribePush(agentId: string | null) {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: existing, agentId }),
      });
      return true;
    }
    const newSub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: newSub, agentId }),
    });
    return true;
  } catch (err) {
    console.warn("Push subscription failed", err);
    return false;
  }
}

export function WebPushManager() {
  const agentId = useAgentStore((state) => state.agentId);
  const { t } = useTranslations();
  const [showPrompt, setShowPrompt] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // On mount: if already subscribed, silently sync. Otherwise show prompt after delay.
  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || !agentId) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        if (cancelled) return;
        if (sub) {
          // Already subscribed — sync silently
          setSubscribed(true);
          fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription: sub, agentId }),
          }).catch(() => {});
        } else {
          // Not subscribed — check if user dismissed recently (7 days cooldown)
          const dismissed = localStorage.getItem(PUSH_DISMISSED_KEY);
          if (dismissed) {
            const dismissedAt = Number(dismissed);
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - dismissedAt < sevenDays) return;
          }
          // Browser already denied — don't show
          if (Notification.permission === "denied") return;
          // Show prompt after delay
          timer = setTimeout(() => {
            if (!cancelled) setShowPrompt(true);
          }, PUSH_PROMPT_DELAY_MS);
        }
      });
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [agentId]);

  const handleAllow = useCallback(async () => {
    setShowPrompt(false);
    const ok = await subscribePush(agentId);
    if (ok) setSubscribed(true);
  }, [agentId]);

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    localStorage.setItem(PUSH_DISMISSED_KEY, String(Date.now()));
  }, []);

  if (subscribed) return null;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.95 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-20 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
        >
          <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-white/15 bg-black/80 backdrop-blur-xl p-5 shadow-[0_0_40px_rgba(80,128,255,0.15)]">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 text-2xl" aria-hidden="true">
                🔔
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  {t("push.promptTitle")}
                </p>
                <p className="mt-1 text-xs text-white/60 leading-relaxed">
                  {t("push.promptBody")}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white/70 transition-all hover:bg-white/10 active:scale-[0.98]"
              >
                {t("push.promptLater")}
              </button>
              <button
                type="button"
                onClick={handleAllow}
                className="flex-1 rounded-xl bg-indigo-500/80 px-3 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-500 active:scale-[0.98]"
              >
                {t("push.promptAllow")}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
