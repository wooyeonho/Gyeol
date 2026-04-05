"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { ACHIEVEMENTS, type AchievementRarity } from "@/lib/engagement/achievements";

const RARITY_CONFIG: Record<AchievementRarity, { label: string; glow: string; border: string; text: string }> = {
  common:    { label: "Common",    glow: "",                              border: "border-white/15",        text: "text-white/60" },
  rare:      { label: "Rare",      glow: "shadow-blue-500/30",            border: "border-blue-400/40",     text: "text-blue-300" },
  epic:      { label: "Epic",      glow: "shadow-purple-500/40",          border: "border-purple-400/50",   text: "text-purple-300" },
  legendary: { label: "Legendary", glow: "shadow-amber-500/50",           border: "border-amber-400/60",    text: "text-amber-300" },
  mythic:    { label: "Mythic",    glow: "shadow-[0_0_20px_#f0abfc80]",   border: "border-fuchsia-300/60",  text: "text-fuchsia-200" },
};

const RARITY_ORDER: AchievementRarity[] = ["mythic", "legendary", "epic", "rare", "common"];

export default function AchievementsPage() {
  const { t, locale } = useTranslations();
  const loc = (["ko", "en", "ja", "zh", "es"].includes(locale) ? locale : "en") as "ko" | "en" | "ja" | "zh" | "es";
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<AchievementRarity | "all">("all");

  useEffect(() => {
    // Load from API
    fetch("/api/achievements")
      .then((r) => (r.ok ? r.json() : { achievements: [] }))
      .then((data) => {
        if (Array.isArray(data.achievements)) {
          setUnlockedIds(new Set((data.achievements as Array<{ achievement_id: string }>).map((a) => a.achievement_id)));
        }
      })
      .catch(() => {});
  }, []);

  const filtered = ACHIEVEMENTS.filter((a) => {
    if (filter !== "all" && a.rarity !== filter) return false;
    if (a.hidden && !unlockedIds.has(a.id)) return false;
    return true;
  });

  const unlockedCount = ACHIEVEMENTS.filter((a) => unlockedIds.has(a.id)).length;

  return (
    <div className="min-h-screen bg-black px-4 pb-28 pt-16">
      <div className="mx-auto max-w-lg space-y-4">

        {/* Header */}
        <header className="text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-purple-300">Achievements</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {t("achievements.title") || "업적"}
          </h1>
          <p className="mt-1 text-sm text-white/40">
            {unlockedCount} / {ACHIEVEMENTS.filter((a) => !a.hidden).length} {t("achievements.unlocked") || "해금"}
          </p>
        </header>

        {/* Rarity filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {(["all", ...RARITY_ORDER] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setFilter(r)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                filter === r
                  ? "bg-white/15 text-white"
                  : "bg-white/5 text-white/40 hover:text-white/70"
              }`}
            >
              {r === "all" ? (t("common.all") || "전체") : RARITY_CONFIG[r as AchievementRarity]?.label ?? r}
            </button>
          ))}
        </div>

        {/* Badge grid */}
        <div className="grid grid-cols-3 gap-3">
          {filtered.map((ach, i) => {
            const unlocked = unlockedIds.has(ach.id);
            const cfg = RARITY_CONFIG[ach.rarity];
            return (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
                className={`relative flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all ${cfg.border} ${unlocked ? `shadow-lg ${cfg.glow} bg-white/[0.06]` : "bg-white/[0.02] opacity-50 grayscale"}`}
              >
                {/* Rarity glow ring for legendary+ */}
                {unlocked && (ach.rarity === "legendary" || ach.rarity === "mythic") && (
                  <div className={`absolute inset-0 rounded-2xl opacity-20 ${ach.rarity === "mythic" ? "bg-fuchsia-400" : "bg-amber-400"} blur-sm`} />
                )}
                <span className="relative text-2xl">{ach.hidden && !unlocked ? "❓" : ach.icon}</span>
                <p className={`relative text-[10px] font-semibold leading-tight ${unlocked ? "text-white" : "text-white/40"}`}>
                  {ach.hidden && !unlocked ? "???" : ach.label[loc]}
                </p>
                <span className={`relative text-[9px] font-medium uppercase tracking-wide ${cfg.text}`}>
                  {cfg.label}
                </span>
                {unlocked && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 flex items-center justify-center"
                  >
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-black" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 6l3 3 5-5" />
                    </svg>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-white/30 py-8">
            {t("achievements.none") || "해당 등급의 업적이 없어요"}
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
