"use client";

import { motion } from "framer-motion";

export interface Badge {
  id: string;
  icon: string;
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  rarity: "common" | "rare" | "epic" | "legendary";
  unlockedAt?: string; // ISO date
}

const RARITY_STYLE: Record<Badge["rarity"], { border: string; glow: string; label: string }> = {
  common:    { border: "border-white/20",    glow: "",                              label: "text-white/50" },
  rare:      { border: "border-blue-400/50", glow: "shadow-blue-400/20 shadow-lg",  label: "text-blue-400" },
  epic:      { border: "border-purple-400/50", glow: "shadow-purple-400/20 shadow-lg", label: "text-purple-400" },
  legendary: { border: "border-amber-400/60", glow: "shadow-amber-400/30 shadow-xl", label: "text-amber-400" },
};

interface AchievementBadgeProps {
  badge: Badge;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  locale?: string;
}

export function AchievementBadge({ badge, size = "md", showTooltip = true, locale = "ko" }: AchievementBadgeProps) {
  const style = RARITY_STYLE[badge.rarity];
  const isKo = locale === "ko";
  const pxMap = { sm: 36, md: 48, lg: 64 };
  const px = pxMap[size];
  const iconSize = { sm: "text-lg", md: "text-2xl", lg: "text-4xl" };

  return (
    <motion.div
      className="group relative"
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {/* Badge circle */}
      <div
        className={`flex items-center justify-center rounded-full border-2 bg-white/[0.06] ${style.border} ${style.glow}`}
        style={{ width: px, height: px }}
      >
        <span className={iconSize[size]} aria-label={badge.name[isKo ? "ko" : "en"]}>
          {badge.icon}
        </span>
      </div>

      {/* Legendary shimmer */}
      {badge.rarity === "legendary" && (
        <motion.div
          className="absolute inset-0 rounded-full bg-amber-400/10"
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
      )}

      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50">
          <div className="rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-center backdrop-blur-sm w-36">
            <p className="text-xs font-bold text-white">{badge.name[isKo ? "ko" : "en"]}</p>
            <p className="text-[10px] text-white/50 mt-0.5">{badge.description[isKo ? "ko" : "en"]}</p>
            <p className={`text-[9px] font-semibold mt-1 ${style.label}`}>
              {badge.rarity.toUpperCase()}
            </p>
            {badge.unlockedAt && (
              <p className="text-[9px] text-white/30 mt-0.5">
                {new Date(badge.unlockedAt).toLocaleDateString(isKo ? "ko-KR" : "en-US")}
              </p>
            )}
          </div>
          {/* Arrow */}
          <div className="h-2 w-2 rotate-45 border-b border-r border-white/10 bg-black/90 -mt-1" />
        </div>
      )}
    </motion.div>
  );
}

/**
 * Badge gallery — displays a row of up to N badges.
 */
interface BadgeGalleryProps {
  badges: Badge[];
  maxVisible?: number;
  size?: AchievementBadgeProps["size"];
  locale?: string;
}

export function BadgeGallery({ badges, maxVisible = 6, size = "md", locale = "ko" }: BadgeGalleryProps) {
  const visible = badges.slice(0, maxVisible);
  const overflow = badges.length - maxVisible;
  const isKo = locale === "ko";

  if (badges.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-white/30 text-xs">
        <span>🏅</span>
        <span>{isKo ? "아직 획득한 배지가 없어요" : "No badges yet"}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {visible.map((badge) => (
        <AchievementBadge key={badge.id} badge={badge} size={size} locale={locale} />
      ))}
      {overflow > 0 && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-xs text-white/40">
          +{overflow}
        </div>
      )}
    </div>
  );
}
