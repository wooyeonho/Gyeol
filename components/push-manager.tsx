"use client";

import { useEffect } from "react";
import { useAgentStore } from "@/store/agent-store";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function WebPushManager() {
  const agentId = useAgentStore((state) => state.agentId);

  useEffect(() => {
    if (!VAPID_PUBLIC_KEY || !agentId) return;
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          if (!subscription) {
             // Auto prompt might be aggressive, but for this addiction mechanic, we request on load.
             registration.pushManager.subscribe({
               userVisibleOnly: true,
               applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
             }).then((newSub) => {
               fetch("/api/push/subscribe", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify({ subscription: newSub, agentId }),
               });
             }).catch((err) => console.warn("Push subscription failed", err));
          } else {
             // Ensure backend has it
             fetch("/api/push/subscribe", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ subscription, agentId }),
             });
          }
        });
      }).catch(console.error);
    }
  }, [agentId]);

  return null;
}
