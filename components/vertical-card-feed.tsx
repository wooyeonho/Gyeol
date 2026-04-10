"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";

interface FeedCard {
  id: string;
  creatureName: string;
  ownerName?: string;
  content: string;
  mood?: string;
  species?: string;
  primaryColor?: string;
  timestamp: string;
  reactions?: number;
}

interface VerticalCardFeedProps {
  cards: FeedCard[];
  onReaction?: (cardId: string) => void;
  onEndReached?: () => void;
}

/**
 * TikTok-style vertical swipe card feed.
 * Each card takes the full viewport height minus nav.
 * Swipe up to see next, down for previous.
 */
export function VerticalCardFeed({ cards, onReaction, onEndReached }: VerticalCardFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const endReachedRef = useRef(false);

  const goNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      setDirection(1);
      setCurrentIndex((i) => i + 1);
    }
    if (currentIndex >= cards.length - 3 && !endReachedRef.current) {
      endReachedRef.current = true;
      onEndReached?.();
    }
  }, [currentIndex, cards.length, onEndReached]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (info.offset.y < -60) goNext();
    else if (info.offset.y > 60) goPrev();
  }, [goNext, goPrev]);

  if (cards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-white/40">
        아직 공유된 크리처가 없어요
      </div>
    );
  }

  const card = cards[currentIndex];
  const color = card.primaryColor ?? "#a78bfa";

  return (
    <div className="relative h-full w-full overflow-hidden touch-pan-y">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={card.id}
          custom={direction}
          initial={{ y: direction > 0 ? 300 : -300, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: direction > 0 ? -300 : 300, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 flex flex-col justify-end p-6"
          style={{
            background: `linear-gradient(180deg, ${color}08 0%, black 60%)`,
          }}
        >
          {/* Card content */}
          <div className="mb-20">
            {/* Species/mood chips */}
            <div className="flex gap-2 mb-3">
              {card.species && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-white/60">
                  {card.species}
                </span>
              )}
              {card.mood && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-medium text-white/60">
                  {card.mood}
                </span>
              )}
            </div>

            {/* Creature name */}
            <h3 className="text-2xl font-bold text-white mb-1">
              {card.creatureName}
            </h3>
            {card.ownerName && (
              <p className="text-xs text-white/40 mb-3">by {card.ownerName}</p>
            )}

            {/* Content */}
            <p className="text-sm leading-relaxed text-white/70 mb-4">
              {card.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4">
              {onReaction && (
                <button
                  type="button"
                  onClick={() => onReaction(card.id)}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-all active:scale-95 active:bg-white/10"
                >
                  <span>❤️</span>
                  <span>{card.reactions ?? 0}</span>
                </button>
              )}
              <span className="text-[10px] text-white/30">{card.timestamp}</span>
            </div>
          </div>

          {/* Progress dots */}
          <div className="absolute top-4 inset-x-0 flex justify-center gap-1">
            {cards.slice(Math.max(0, currentIndex - 3), currentIndex + 4).map((c, i) => {
              const actualIndex = Math.max(0, currentIndex - 3) + i;
              return (
                <div
                  key={c.id}
                  className="h-1 rounded-full transition-all"
                  style={{
                    width: actualIndex === currentIndex ? 16 : 4,
                    background: actualIndex === currentIndex ? color : "rgba(255,255,255,0.2)",
                  }}
                />
              );
            })}
          </div>

          {/* Swipe hint */}
          {currentIndex === 0 && cards.length > 1 && (
            <motion.div
              className="absolute bottom-6 inset-x-0 flex justify-center"
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-xs text-white/30">↑ 위로 스와이프</span>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
