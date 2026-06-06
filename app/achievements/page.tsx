"use client";

import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { useTranslations } from "@/components/i18n-provider";
import { ACHIEVEMENTS, getAchievement, type AchievementRarity } from "@/lib/engagement/achievements";
import { LevelUnlockPreview } from "@/components/engagement/level-unlock-preview";
import { useCelebrationStore } from "@/store/celebration-store";
import { AchievementCard } from "@/components/gamification/achievement-card";
import { AchievementShareCard } from "@/components/engagement/achievement-share-card";

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
  const celebrate = useCelebrationStore((s) => s.celebrate);

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    // Load from API — the route returns each achievement definition
    // with `unlocked` + `newly_unlocked` booleans. We collect unlocked
    // ids for the grid and trigger a celebration for the rarest newly
    // unlocked entry.
    fetch("/api/achievements", { cache: "no-store", signal: controller.signal })
      .then((r) => (r.ok ? r.json() : { achievements: [] }))
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data.achievements)) {
            setLoading(false);
            return;
        }

        type ApiAchievement = { id?: string; achievement_id?: string; unlocked?: boolean; newly_unlocked?: boolean };
        const all: ApiAchievement[] = data.achievements;

        // Track every unlocked id so the grid updates
        const unlockedSet = new Set(
          all
            .filter((a) => a.unlocked || a.newly_unlocked)
            .map((a) => a.id ?? a.achievement_id ?? ""),
        );
        setUnlockedIds(unlockedSet);
        setLoading(false);

        // Trigger celebration for the rarest newly-unlocked achievement
        const newly = all.filter((a) => a.newly_unlocked);
        if (newly.length > 0) {
          const RARITY_WEIGHT: Record<string, number> = { mythic: 5, legendary: 4, epic: 3, rare: 2, common: 1 };
          const sorted = newly
            .map((a) => ({ a, def: getAchievement(a.id ?? a.achievement_id ?? "") }))
            .filter((x): x is { a: ApiAchievement; def: NonNullable<ReturnType<typeof getAchievement>> } => Boolean(x.def))
            .sort((x, y) => (RARITY_WEIGHT[y.def.rarity] ?? 0) - (RARITY_WEIGHT[x.def.rarity] ?? 0));
          const top = sorted[0];
          if (top) {
            // Mark as seen so we don't trigger again on next visit, wait for it before showing
            fetch("/api/achievements", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal
            }).then(() => {
                if (controller.signal.aborted) return;
                const variant =
                  top.def.rarity === "mythic" || top.def.rarity === "legendary"
                    ? "firework"
                    : top.def.rarity === "epic"
                    ? "sparkle"
                    : "confetti";
                celebrate({
                  title: `${top.def.icon} ${top.def.label[loc]}`,
                  subtitle: top.def.description[loc],
                  reward: top.def.reward.coins
                    ? { type: "coins", amount: top.def.reward.coins, icon: "🪙" }
                    : undefined,
                  variant,
                  autoDismissMs: 4000,
                });
            }).catch(() => {});
          }
        }
      })
      .catch((e) => {
          if (e.name !== 'AbortError') {
              setLoading(false);
          }
      });
    return () => {
      controller.abort();
    };
  }, [celebrate, loc]);

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
        <header className="diamond-border rounded-2xl p-6 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-purple-300">Achievements</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {t("achievements.title") || "업적"}
          </h1>
          <p className="mt-1 text-sm text-white/40">
            {unlockedCount} / {ACHIEVEMENTS.filter((a) => !a.hidden).length} {t("achievements.unlocked") || "해금"}
          </p>
          {unlockedCount === 0 && (
            <p className="mx-auto mt-3 max-w-xs rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-relaxed text-white/55">
              아직 해금된 업적이 없어요. 대화하고 돌봐주면 가장 먼저 &ldquo;첫 인사&rdquo; 같은 업적부터 열려요.
            </p>
          )}
        </header>

        {/* Level unlock preview — "coming up at level X" */}
        <LevelUnlockPreview />

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
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
               <div key={i} className="h-24 w-full rounded-2xl bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ach) => {
              const unlocked = unlockedIds.has(ach.id);
              return unlocked ? (
                <AchievementShareCard
                  key={ach.id}
                  achievement={{
                    id: ach.id,
                    name: ach.label[loc],
                    description: ach.description[loc],
                    icon: ach.icon,
                    rarity: ach.rarity,
                  }}
                  onShare={() => {
                    if (typeof navigator?.share === "function") {
                      navigator.share({
                        title: `GYEOL - ${ach.label[loc]}`,
                        text: ach.description[loc],
                        url: `${window.location.origin}/api/og/achievement?id=${ach.id}`,
                      }).catch(() => {});
                    }
                  }}
                />
              ) : (
                <AchievementCard
                  key={ach.id}
                  achievement={ach}
                  unlocked={unlocked}
                />
              );
            })}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <p className="text-center text-sm text-white/30 py-8">
            {t("achievements.none") || "해당 등급의 업적이 없어요"}
          </p>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
