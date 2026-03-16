"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "@/components/i18n-provider";

type FeedItem = {
  id: string;
  text: string;
};

export function GlobalFeedTicker() {
  const { locale } = useTranslations();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    async function fetchFeed() {
      try {
        const res = await fetch("/api/social/global-feed");
        if (res.ok) {
          const json = await res.json();
          if (json.feed && Array.isArray(json.feed) && json.feed.length > 0) {
            setItems(json.feed);
          }
        }
      } catch (e) {
        console.error("Failed to load global feed", e);
      }
    }
    void fetchFeed();
  }, []);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div
      className="w-full mb-4 overflow-hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-white/70"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
        </span>
        <div className="flex-1 min-w-0">
          <span className="font-medium text-white/90 mr-2">
            {locale === "en" ? "Live" : "실시간"}
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={currentIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="inline-block"
            >
              {items[currentIndex].text}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
