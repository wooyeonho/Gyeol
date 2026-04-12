"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SpringCard } from "@/components/ui/spring-card";
import { SkeletonCard } from "@/components/ui/skeleton";
import { spring } from "@/lib/design/tokens";
import { type ContentItem, generateDJSet } from "@/lib/ai/content-dj";

interface AiDjFeedProps {
  streakDays: number;
  creatureLevel: number;
  mood: string | null;
  locale: string;
  className?: string;
}

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  tip: { icon: "💡", color: "text-yellow-400" },
  quest: { icon: "⚔️", color: "text-purple-400" },
  memory: { icon: "💭", color: "text-pink-400" },
  social: { icon: "👥", color: "text-cyan-400" },
  discovery: { icon: "🔍", color: "text-blue-400" },
  challenge: { icon: "🏆", color: "text-amber-400" },
};

export function AiDjFeed({ streakDays, creatureLevel, mood, locale, className = "" }: AiDjFeedProps) {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/personalization/feed")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        const raw: ContentItem[] = data.items ?? [];
        const curated = generateDJSet(raw, {
          streakDays,
          creatureLevel,
          mood,
          recentInteractions: [],
          hourOfDay: new Date().getHours(),
          locale,
        });
        setItems(curated);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [streakDays, creatureLevel, mood, locale]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* DJ Header */}
      <div className="flex items-center gap-2 px-1">
        <motion.span
          animate={{ rotate: [0, 15, -15, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="text-lg"
        >
          🎧
        </motion.span>
        <div>
          <p className="text-xs font-semibold text-white">AI DJ</p>
          <p className="text-[10px] text-white/40">오늘 당신을 위한 큐레이션</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-sm text-white/30">
          추천 콘텐츠를 준비 중이에요
        </div>
      ) : (
        <AnimatePresence>
          {items.map((item, idx) => {
            const conf = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.tip;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring.apple, delay: idx * 0.05 }}
              >
                <SpringCard className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-sm ${conf.color}`}>{conf.icon}</span>
                    <span className="text-xs font-medium text-white">{item.title}</span>
                  </div>
                  <p className="text-xs text-white/50 line-clamp-2">{item.body}</p>
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-white/5 px-2 py-0.5 text-[9px] text-white/30">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </SpringCard>
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
