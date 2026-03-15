"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "@/components/i18n-provider";

type FeedItem = {
  id: string;
  text: string;
};

export function GlobalFeedTicker() {
  const { locale, t } = useTranslations();
  void locale;
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
    <div className="w-full mb-4 overflow-hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70">
      <div className="flex items-center gap-3">
        <span className="flex h-2 w-2 shrink-0 animate-pulse rounded-full bg-cyan-400" />
        <p className="flex-1 truncate">
          <span className="font-medium text-white/90 mr-2">
            {t("globalFeed.echo")}
          </span>
          <span className="animate-fade-in transition-opacity duration-500">
            {items[currentIndex].text}
          </span>
        </p>
      </div>
    </div>
  );
}
