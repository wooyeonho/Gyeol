"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ACHIEVEMENTS,
  type AchievementDefinition,
  type AchievementRarity,
} from "@/lib/engagement/achievements";

const MAX_SLOTS = 3;

const RARITY_BORDER: Record<AchievementRarity, string> = {
  common: "border-white/15",
  rare: "border-blue-400/50",
  epic: "border-purple-400/60",
  legendary: "border-amber-400/65",
  mythic: "border-fuchsia-300/70",
};

type Locale = "ko" | "en" | "ja" | "zh" | "es";

interface FeaturedBadgePickerProps {
  locale?: Locale;
}

type ServerBadge = {
  id: string;
  icon: string;
  rarity: AchievementRarity;
  label: Record<Locale, string>;
};

type AchievementResponse = {
  achievements: Array<AchievementDefinition & { unlocked?: boolean }>;
};

/**
 * Phase 2-3 profile badge slot.
 *
 * Lets users pin up to 3 unlocked achievements to their profile card
 * via /api/profile/featured-badges. Shows the currently pinned slots
 * and an unlocked-badge grid below for picking.
 */
export function FeaturedBadgePicker({ locale = "ko" }: FeaturedBadgePickerProps) {
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Initial load — fetch current featured list and unlocked set in parallel.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/profile/featured-badges", { cache: "no-store" }).then((r) =>
        r.ok ? (r.json() as Promise<{ badges: ServerBadge[] }>) : null,
      ),
      fetch("/api/achievements", { cache: "no-store" }).then((r) =>
        r.ok ? (r.json() as Promise<AchievementResponse>) : null,
      ),
    ])
      .then(([featured, achievements]) => {
        if (cancelled) return;
        if (featured) setPinnedIds(featured.badges.map((b) => b.id));
        if (achievements) {
          setUnlockedIds(
            new Set(
              achievements.achievements
                .filter((a) => a.unlocked)
                .map((a) => a.id),
            ),
          );
        }
      })
      .catch(() => {
        /* best-effort */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const save = useCallback(async (next: string[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/featured-badges", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badges: next }),
      });
      if (res.ok) {
        const json = (await res.json()) as { badges: string[] };
        setPinnedIds(json.badges ?? next);
        setSavedAt(Date.now());
      }
    } catch {
      /* best-effort */
    } finally {
      setSaving(false);
    }
  }, []);

  const togglePin = useCallback(
    (id: string) => {
      if (pinnedIds.includes(id)) {
        void save(pinnedIds.filter((p) => p !== id));
        return;
      }
      if (pinnedIds.length >= MAX_SLOTS) return; // Slots full — ignore.
      void save([...pinnedIds, id]);
    },
    [pinnedIds, save],
  );

  const unlockedAchievements = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id));

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
          대표 뱃지 (최대 {MAX_SLOTS}개)
        </p>
        {savedAt && Date.now() - savedAt < 2500 && (
          <span className="text-[10px] text-emerald-300">저장됨 ✓</span>
        )}
      </div>
      <p className="mb-3 text-[10px] text-white/25">프로필 카드에 자랑하고 싶은 업적을 꽂아보세요</p>

      {/* Pinned slots */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {Array.from({ length: MAX_SLOTS }).map((_, i) => {
          const id = pinnedIds[i];
          const def = id ? ACHIEVEMENTS.find((a) => a.id === id) : undefined;
          if (!def) {
            return (
              <div
                key={`slot-${i}`}
                className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]"
                aria-label={`Empty slot ${i + 1}`}
              >
                <span className="text-xl text-white/15">＋</span>
              </div>
            );
          }
          return (
            <motion.button
              key={`slot-${i}-${def.id}`}
              type="button"
              layout
              whileTap={{ scale: 0.94 }}
              onClick={() => togglePin(def.id)}
              className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border ${RARITY_BORDER[def.rarity]} bg-white/[0.05] text-center transition-colors hover:bg-white/[0.08]`}
            >
              <span className="text-2xl">{def.icon}</span>
              <span className="px-1 text-[9px] font-semibold leading-tight text-white/80">
                {def.label[locale]}
              </span>
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-400/80 text-[9px] font-bold text-black">
                ×
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Unlocked picker */}
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/30">
        내 업적 ({unlockedAchievements.length})
      </p>
      {loading ? (
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-white/5" />
          ))}
        </div>
      ) : unlockedAchievements.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-4 text-center text-[11px] text-white/30">
          아직 해금된 업적이 없어요. 돌봄과 대화로 모아봐요!
        </p>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {unlockedAchievements.map((def) => {
            const isPinned = pinnedIds.includes(def.id);
            const slotsFull = !isPinned && pinnedIds.length >= MAX_SLOTS;
            return (
              <motion.button
                key={def.id}
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => togglePin(def.id)}
                disabled={saving || slotsFull}
                className={`relative flex aspect-square items-center justify-center rounded-xl border transition-all ${RARITY_BORDER[def.rarity]} ${
                  isPinned
                    ? "bg-white/[0.1] shadow-[0_0_20px_rgba(255,255,255,0.12)]"
                    : slotsFull
                      ? "bg-white/[0.02] opacity-40"
                      : "bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
                aria-label={`${def.label[locale]} ${isPinned ? "(pinned)" : ""}`}
                aria-pressed={isPinned}
              >
                <span className="text-lg">{def.icon}</span>
                {isPinned && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-bold text-black">
                    ✓
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}
