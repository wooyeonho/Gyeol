/**
 * Daily Challenge System — rotating micro-goals that drive daily engagement.
 *
 * Each day, users get 3 challenges (easy/medium/hard). Completing all 3
 * yields a bonus "perfect day" reward. Challenges rotate to prevent monotony.
 *
 * This is the #1 engagement driver from games like Genshin Impact, Duolingo, etc.
 */

export type ChallengeDifficulty = "easy" | "medium" | "hard";
export type ChallengeStatus = "locked" | "active" | "completed";

export interface DailyChallenge {
  id: string;
  difficulty: ChallengeDifficulty;
  label: { ko: string; en: string };
  description: { ko: string; en: string };
  icon: string;
  condition: ChallengeCondition;
  reward: ChallengeReward;
}

export type ChallengeCondition =
  | { type: "send_messages"; count: number }
  | { type: "send_long_message"; minLength: number }
  | { type: "use_feature"; feature: string }
  | { type: "earn_coins"; amount: number }
  | { type: "react_to_posts"; count: number }
  | { type: "visit_social_feed" }
  | { type: "check_leaderboard" }
  | { type: "share_post" }
  | { type: "give_gift" }
  | { type: "ask_deep_question" };

export interface ChallengeReward {
  coins: number;
  evolution_points?: number;
  emoji_dust?: number;
}

export interface DailyChallengeState {
  date: string; // ISO date string YYYY-MM-DD
  challenges: Array<{
    id: string;
    difficulty: ChallengeDifficulty;
    progress: number;
    target: number;
    completed: boolean;
  }>;
  perfectDayClaimed: boolean;
}

const STORAGE_KEY = "gyeol_daily_challenges_v1";

// ── Challenge Pool ──

const EASY_CHALLENGES: DailyChallenge[] = [
  {
    id: "chat_3",
    difficulty: "easy",
    label: { ko: "안부 인사", en: "Say Hello" },
    description: { ko: "3개의 메시지를 보내세요", en: "Send 3 messages" },
    icon: "💬",
    condition: { type: "send_messages", count: 3 },
    reward: { coins: 8 },
  },
  {
    id: "visit_feed",
    difficulty: "easy",
    label: { ko: "소셜 체크인", en: "Social Check-in" },
    description: { ko: "소셜 피드를 확인하세요", en: "Visit the social feed" },
    icon: "📱",
    condition: { type: "visit_social_feed" },
    reward: { coins: 5 },
  },
  {
    id: "earn_10_coins",
    difficulty: "easy",
    label: { ko: "코인 수집가", en: "Coin Collector" },
    description: { ko: "오늘 10코인을 모으세요", en: "Earn 10 coins today" },
    icon: "🪙",
    condition: { type: "earn_coins", amount: 10 },
    reward: { coins: 5, emoji_dust: 1 },
  },
];

const MEDIUM_CHALLENGES: DailyChallenge[] = [
  {
    id: "chat_10",
    difficulty: "medium",
    label: { ko: "깊은 대화", en: "Deep Talk" },
    description: { ko: "10개의 메시지를 보내세요", en: "Send 10 messages" },
    icon: "🗣️",
    condition: { type: "send_messages", count: 10 },
    reward: { coins: 15, evolution_points: 2 },
  },
  {
    id: "react_3",
    difficulty: "medium",
    label: { ko: "리액션 마스터", en: "Reaction Master" },
    description: { ko: "다른 포스트에 3번 리액션하세요", en: "React to 3 posts" },
    icon: "❤️",
    condition: { type: "react_to_posts", count: 3 },
    reward: { coins: 12, emoji_dust: 2 },
  },
  {
    id: "long_msg",
    difficulty: "medium",
    label: { ko: "진심 담기", en: "Pour Your Heart" },
    description: { ko: "100자 이상의 메시지를 보내세요", en: "Send a message with 100+ characters" },
    icon: "📝",
    condition: { type: "send_long_message", minLength: 100 },
    reward: { coins: 12, evolution_points: 1 },
  },
  {
    id: "check_ranking",
    difficulty: "medium",
    label: { ko: "랭킹 확인", en: "Check Rankings" },
    description: { ko: "리더보드를 확인하세요", en: "Check the leaderboard" },
    icon: "🏆",
    condition: { type: "check_leaderboard" },
    reward: { coins: 10 },
  },
];

const HARD_CHALLENGES: DailyChallenge[] = [
  {
    id: "chat_25",
    difficulty: "hard",
    label: { ko: "마라톤 대화", en: "Marathon Chat" },
    description: { ko: "25개의 메시지를 보내세요", en: "Send 25 messages" },
    icon: "🏃",
    condition: { type: "send_messages", count: 25 },
    reward: { coins: 30, evolution_points: 5 },
  },
  {
    id: "send_gift",
    difficulty: "hard",
    label: { ko: "선물의 기쁨", en: "Joy of Giving" },
    description: { ko: "다른 사람에게 선물을 보내세요", en: "Send a gift to someone" },
    icon: "🎁",
    condition: { type: "give_gift" },
    reward: { coins: 25, evolution_points: 3, emoji_dust: 3 },
  },
  {
    id: "share_creation",
    difficulty: "hard",
    label: { ko: "공유의 힘", en: "Power of Sharing" },
    description: { ko: "소셜 포스트를 공유하세요", en: "Share a social post" },
    icon: "🔗",
    condition: { type: "share_post" },
    reward: { coins: 20, evolution_points: 3 },
  },
  {
    id: "deep_question",
    difficulty: "hard",
    label: { ko: "철학자", en: "Philosopher" },
    description: { ko: "깊은 질문을 해보세요", en: "Ask a deep question" },
    icon: "🤔",
    condition: { type: "ask_deep_question" },
    reward: { coins: 25, evolution_points: 4 },
  },
];

const PERFECT_DAY_BONUS: ChallengeReward = {
  coins: 50,
  evolution_points: 8,
  emoji_dust: 5,
};

/**
 * Deterministic daily selection using date as seed.
 * Same day = same challenges globally (creates shared social experience).
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function dateSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickRandom<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function getTodayDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function generateDailyChallenges(dateStr: string): DailyChallenge[] {
  const rng = seededRandom(dateSeed(dateStr));
  return [
    pickRandom(EASY_CHALLENGES, rng),
    pickRandom(MEDIUM_CHALLENGES, rng),
    pickRandom(HARD_CHALLENGES, rng),
  ];
}

export function getPerfectDayBonus(): ChallengeReward {
  return { ...PERFECT_DAY_BONUS };
}

export function getTargetForCondition(condition: ChallengeCondition): number {
  switch (condition.type) {
    case "send_messages":
      return condition.count;
    case "send_long_message":
      return 1;
    case "earn_coins":
      return condition.amount;
    case "react_to_posts":
      return condition.count;
    case "visit_social_feed":
    case "check_leaderboard":
    case "share_post":
    case "give_gift":
    case "ask_deep_question":
    case "use_feature":
      return 1;
  }
}

// ── Client-side persistence ──

function isBrowser() {
  return typeof window !== "undefined";
}

export function readDailyChallengeState(): DailyChallengeState | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DailyChallengeState;
  } catch {
    return null;
  }
}

export function writeDailyChallengeState(state: DailyChallengeState): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage write errors.
  }
}

export function initOrRefreshDailyChallenges(now = new Date()): DailyChallengeState {
  const today = getTodayDateString(now);
  const existing = readDailyChallengeState();

  if (existing && existing.date === today) return existing;

  const challenges = generateDailyChallenges(today);
  const state: DailyChallengeState = {
    date: today,
    challenges: challenges.map((c) => ({
      id: c.id,
      difficulty: c.difficulty,
      progress: 0,
      target: getTargetForCondition(c.condition),
      completed: false,
    })),
    perfectDayClaimed: false,
  };
  writeDailyChallengeState(state);
  return state;
}

export function isAllChallengesCompleted(state: DailyChallengeState): boolean {
  return state.challenges.every((c) => c.completed);
}
