/**
 * Phase 1-2: Level-based feature unlock registry.
 *
 * Every entry here is a "carrot" — something the user sees they will
 * earn at a future level. The goal is to give the XP grind a visible
 * shape instead of an abstract number climbing forever.
 *
 * Locks here are purely cosmetic / UX-level hints. Actual feature
 * enforcement still lives in each route (some are gated by vitality,
 * coins, or ownership of a creature). This registry is what powers
 * the "coming soon" card on the home page.
 */

export type LevelUnlock = {
  level: number;
  icon: string;
  title: string;
  description: string;
  href?: string;
};

export const LEVEL_UNLOCKS: LevelUnlock[] = [
  {
    level: 2,
    icon: "📓",
    title: "감정 일기",
    description: "크리처가 매일 쓰는 한 줄 일기를 볼 수 있어요",
    href: "/diary",
  },
  {
    level: 3,
    icon: "🏆",
    title: "주간 리그",
    description: "30명 단위 그룹에서 주간 XP 경쟁에 참여해요",
    href: "/leaderboard",
  },
  {
    level: 4,
    icon: "🫧",
    title: "감정 대시보드",
    description: "2주치 감정 그래프와 친밀도 변화를 확인해요",
    href: "/emotion",
  },
  {
    level: 5,
    icon: "🎨",
    title: "프로필 꾸미기",
    description: "배경 테마 + 대표 뱃지 3개 장착",
    href: "/profile/customize",
  },
  {
    level: 6,
    icon: "🔍",
    title: "Discover 피드",
    description: "다른 생명체를 발견하고 인사할 수 있어요",
    href: "/discover",
  },
  {
    level: 8,
    icon: "👥",
    title: "종족 커뮤니티",
    description: "같은 종족 유저들과 함께 대화해요",
    href: "/community",
  },
  {
    level: 10,
    icon: "🧬",
    title: "고급 DNA 편집",
    description: "전문 DNA 조합을 해금하고 실험해요",
    href: "/settings",
  },
  {
    level: 15,
    icon: "💠",
    title: "옵시디안 리그",
    description: "최상위 리그까지 오르면 전용 뱃지가 열려요",
  },
];

/**
 * Returns the next 3 upcoming unlocks given a current level.
 * Stable across renders — pure function, no state.
 */
export function getNextUnlocks(currentLevel: number, count = 3): LevelUnlock[] {
  return LEVEL_UNLOCKS.filter((u) => u.level > currentLevel).slice(0, count);
}

export function getUnlocksAtOrBefore(currentLevel: number): LevelUnlock[] {
  return LEVEL_UNLOCKS.filter((u) => u.level <= currentLevel);
}
