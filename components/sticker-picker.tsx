"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateStickerPack,
  getStickersByRarity,
  getUnlockedStickers,
  getStickerProgress,
  type Sticker,
  type StickerPack,
} from "@/lib/creature/sticker-system";
import type { CreatureDNA } from "@/lib/genome/dna";
import { haptic } from "@/lib/micro-interactions";

const RARITY_COLORS: Record<string, string> = {
  common: "#94a3b8",
  rare: "#60a5fa",
  epic: "#c084fc",
};

interface StickerPickerProps {
  dna: CreatureDNA;
  creatureName: string;
  onSelect: (sticker: Sticker) => void;
  onClose: () => void;
  locale?: string;
}

export function StickerPicker({ dna, creatureName, onSelect, onClose, locale = "ko" }: StickerPickerProps) {
  const [filter, setFilter] = useState<"all" | "common" | "rare" | "epic">("all");
  const isKo = locale === "ko";

  const pack = useMemo(() => generateStickerPack(creatureName, dna), [creatureName, dna]);
  const progress = useMemo(() => getStickerProgress(pack), [pack]);

  const displayedStickers = useMemo(() => {
    if (filter === "all") return pack.stickers;
    return getStickersByRarity(pack, filter);
  }, [pack, filter]);

  const handleSelect = (sticker: Sticker) => {
    if (!sticker.unlocked) return;
    haptic("tap");
    onSelect(sticker);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="rounded-2xl border border-white/15 bg-black/90 p-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] backdrop-blur-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-white">
            {creatureName} {isKo ? "스티커" : "Stickers"}
          </p>
          <p className="text-[10px] text-white/40">
            {progress.unlocked}/{progress.total} ({progress.percentage}%)
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white/70"
        >
          ✕
        </button>
      </div>

      {/* Rarity filters */}
      <div className="flex gap-1 mb-3">
        {(["all", "common", "rare", "epic"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setFilter(r)}
            className={`rounded-full px-2.5 py-1 text-[10px] transition-all ${
              filter === r ? "bg-white/15 text-white" : "bg-white/5 text-white/40"
            }`}
          >
            {r === "all" ? (isKo ? "전체" : "All") : r}
          </button>
        ))}
      </div>

      {/* Sticker grid */}
      <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-y-auto">
        {displayedStickers.map((sticker) => (
          <motion.button
            key={sticker.id}
            type="button"
            onClick={() => handleSelect(sticker)}
            disabled={!sticker.unlocked}
            whileTap={sticker.unlocked ? { scale: 0.85 } : undefined}
            className={`relative flex flex-col items-center gap-0.5 rounded-xl p-2 transition-all ${
              sticker.unlocked
                ? "hover:bg-white/10 active:bg-white/15 cursor-pointer"
                : "opacity-30 cursor-not-allowed"
            }`}
            title={isKo ? sticker.label.ko : sticker.label.en}
          >
            <span className="text-2xl">{sticker.emoji}</span>
            <span className="text-[8px] text-white/40 truncate w-full text-center">
              {isKo ? sticker.label.ko : sticker.label.en}
            </span>
            {/* Rarity indicator dot */}
            <div
              className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: RARITY_COLORS[sticker.rarity] }}
            />
            {/* Lock icon for locked stickers */}
            {!sticker.unlocked && (
              <span className="absolute inset-0 flex items-center justify-center text-xs text-white/30">
                🔒
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Hint */}
      <p className="mt-2 text-center text-[9px] text-white/25">
        {isKo ? "DNA 성장으로 새 스티커가 해금돼요" : "Grow DNA to unlock new stickers"}
      </p>
    </motion.div>
  );
}
