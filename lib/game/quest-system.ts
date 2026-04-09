/**
 * Procedural Quest/Challenge System
 *
 * Generates daily, weekly, and special quests procedurally based on creature
 * DNA strengths. Analytical creatures get knowledge quests, empathetic ones
 * get emotional quests, etc. Uses seeded randomness based on date to ensure
 * deterministic quest generation per day.
 */

import type { CreatureDNA } from "@/lib/genome/dna";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuestType =
  | "chat"
  | "care"
  | "explore"
  | "social"
  | "knowledge"
  | "emotional";

export type QuestDifficulty = "easy" | "medium" | "hard" | "legendary";
export type QuestStatus = "available" | "active" | "completed" | "expired";

export interface Quest {
  id: string;
  type: QuestType;
  difficulty: QuestDifficulty;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  objective: { type: string; target: number; current: number };
  rewards: { coins: number; xp: number; item?: string };
  expiresAt?: string; // ISO date
  status: QuestStatus;
}

// ---------------------------------------------------------------------------
// Quest Templates (20+)
// ---------------------------------------------------------------------------

export interface QuestTemplate {
  type: QuestType;
  difficulty: QuestDifficulty;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  objective: { type: string; target: number };
  rewards: { coins: number; xp: number; item?: string };
}

export const QUEST_TEMPLATES: QuestTemplate[] = [
  // ── Chat quests ──────────────────────────────────────────────────────────
  {
    type: "chat",
    difficulty: "easy",
    title: { ko: "첫 대화", en: "Start a Conversation" },
    description: {
      ko: "크리처와 3개 이상의 메시지를 주고받으세요",
      en: "Exchange 3+ messages with your creature",
    },
    objective: { type: "messages_sent", target: 3 },
    rewards: { coins: 10, xp: 15 },
  },
  {
    type: "chat",
    difficulty: "medium",
    title: { ko: "깊은 대화", en: "Deep Conversation" },
    description: {
      ko: "한 주제에 대해 5개 이상의 메시지를 이어가세요",
      en: "Have a deep conversation (5+ messages)",
    },
    objective: { type: "messages_sent", target: 5 },
    rewards: { coins: 25, xp: 30 },
  },
  {
    type: "chat",
    difficulty: "easy",
    title: { ko: "감정 물어보기", en: "Ask About Feelings" },
    description: {
      ko: "크리처의 기분을 물어보세요",
      en: "Ask your creature how it feels",
    },
    objective: { type: "feeling_asked", target: 1 },
    rewards: { coins: 10, xp: 10 },
  },
  {
    type: "chat",
    difficulty: "hard",
    title: { ko: "이야기꾼", en: "Share a Story" },
    description: {
      ko: "크리처에게 긴 이야기를 들려주세요",
      en: "Share a long story with your creature",
    },
    objective: { type: "long_message_sent", target: 2 },
    rewards: { coins: 40, xp: 50 },
  },

  // ── Care quests ──────────────────────────────────────────────────────────
  {
    type: "care",
    difficulty: "easy",
    title: { ko: "밥 주기", en: "Feed Your Creature" },
    description: {
      ko: "크리처에게 3번 먹이를 주세요",
      en: "Feed your creature 3 times",
    },
    objective: { type: "feed", target: 3 },
    rewards: { coins: 15, xp: 20 },
  },
  {
    type: "care",
    difficulty: "easy",
    title: { ko: "휴식 시간", en: "Let Them Rest" },
    description: {
      ko: "크리처를 쉬게 해주세요",
      en: "Let your creature rest for a while",
    },
    objective: { type: "rest", target: 1 },
    rewards: { coins: 10, xp: 10 },
  },
  {
    type: "care",
    difficulty: "medium",
    title: { ko: "함께 놀기", en: "Play Together" },
    description: {
      ko: "크리처와 놀이 활동을 3회 진행하세요",
      en: "Play with your creature 3 times",
    },
    objective: { type: "play", target: 3 },
    rewards: { coins: 25, xp: 30 },
  },
  {
    type: "care",
    difficulty: "hard",
    title: { ko: "완벽한 돌봄", en: "Perfect Caretaker" },
    description: {
      ko: "모든 돌봄 활동을 하루에 완료하세요",
      en: "Complete all care activities in one day",
    },
    objective: { type: "all_care", target: 5 },
    rewards: { coins: 50, xp: 60 },
  },

  // ── Explore quests ───────────────────────────────────────────────────────
  {
    type: "explore",
    difficulty: "easy",
    title: { ko: "DNA 탐험", en: "Visit the DNA Page" },
    description: {
      ko: "DNA 페이지를 방문해보세요",
      en: "Visit your creature's DNA page",
    },
    objective: { type: "page_visit_dna", target: 1 },
    rewards: { coins: 10, xp: 10 },
  },
  {
    type: "explore",
    difficulty: "easy",
    title: { ko: "소셜 피드 확인", en: "Check the Social Feed" },
    description: {
      ko: "소셜 피드를 확인해보세요",
      en: "Check the social feed for updates",
    },
    objective: { type: "page_visit_social", target: 1 },
    rewards: { coins: 10, xp: 10 },
  },
  {
    type: "explore",
    difficulty: "medium",
    title: { ko: "미스터리 박스", en: "Open a Mystery Box" },
    description: {
      ko: "미스터리 박스를 열어보세요",
      en: "Open a mystery box to discover something new",
    },
    objective: { type: "mystery_box_open", target: 1 },
    rewards: { coins: 20, xp: 25, item: "random_cosmetic" },
  },
  {
    type: "explore",
    difficulty: "hard",
    title: { ko: "숨겨진 장소", en: "Hidden Corners" },
    description: {
      ko: "앱의 5개 이상의 다른 페이지를 방문하세요",
      en: "Visit 5 or more different pages in the app",
    },
    objective: { type: "pages_visited", target: 5 },
    rewards: { coins: 35, xp: 45 },
  },

  // ── Social quests ────────────────────────────────────────────────────────
  {
    type: "social",
    difficulty: "easy",
    title: { ko: "좋아요 3개", en: "Like 3 Posts" },
    description: {
      ko: "소셜 피드에서 게시물 3개에 좋아요를 누르세요",
      en: "Like 3 posts on the social feed",
    },
    objective: { type: "likes_given", target: 3 },
    rewards: { coins: 10, xp: 15 },
  },
  {
    type: "social",
    difficulty: "medium",
    title: { ko: "댓글 달기", en: "Write a Comment" },
    description: {
      ko: "다른 사람의 게시물에 댓글을 달아보세요",
      en: "Write a comment on someone else's post",
    },
    objective: { type: "comments_written", target: 1 },
    rewards: { coins: 20, xp: 25 },
  },
  {
    type: "social",
    difficulty: "medium",
    title: { ko: "크리처 공유", en: "Share Your Creature" },
    description: {
      ko: "크리처를 소셜에 공유하세요",
      en: "Share your creature on the social feed",
    },
    objective: { type: "creature_shared", target: 1 },
    rewards: { coins: 25, xp: 30 },
  },
  {
    type: "social",
    difficulty: "hard",
    title: { ko: "인기 스타", en: "Social Butterfly" },
    description: {
      ko: "게시물, 댓글, 좋아요를 모두 해보세요",
      en: "Post, comment, and like all in one day",
    },
    objective: { type: "social_trifecta", target: 3 },
    rewards: { coins: 45, xp: 55 },
  },

  // ── Knowledge quests ─────────────────────────────────────────────────────
  {
    type: "knowledge",
    difficulty: "easy",
    title: { ko: "새로운 배움", en: "Learn Something New" },
    description: {
      ko: "크리처에게 새로운 것을 물어보세요",
      en: "Learn something new from your creature",
    },
    objective: { type: "knowledge_gained", target: 1 },
    rewards: { coins: 15, xp: 20 },
  },
  {
    type: "knowledge",
    difficulty: "medium",
    title: { ko: "어려운 질문", en: "Ask a Hard Question" },
    description: {
      ko: "크리처에게 깊은 질문을 해보세요",
      en: "Ask your creature a challenging question",
    },
    objective: { type: "hard_question_asked", target: 1 },
    rewards: { coins: 30, xp: 35 },
  },
  {
    type: "knowledge",
    difficulty: "hard",
    title: { ko: "지식 전수", en: "Knowledge Transfer" },
    description: {
      ko: "크리처에게 복잡한 개념을 가르쳐보세요",
      en: "Teach your creature a complex concept step by step",
    },
    objective: { type: "teaching_session", target: 3 },
    rewards: { coins: 50, xp: 60 },
  },

  // ── Emotional quests ─────────────────────────────────────────────────────
  {
    type: "emotional",
    difficulty: "easy",
    title: { ko: "위로하기", en: "Comfort Your Creature" },
    description: {
      ko: "크리처를 따뜻하게 위로해주세요",
      en: "Say something comforting to your creature",
    },
    objective: { type: "comfort_given", target: 1 },
    rewards: { coins: 10, xp: 15 },
  },
  {
    type: "emotional",
    difficulty: "medium",
    title: { ko: "함께 축하", en: "Celebrate Together" },
    description: {
      ko: "크리처와 기쁜 순간을 함께 나누세요",
      en: "Share a joyful moment with your creature",
    },
    objective: { type: "celebration", target: 1 },
    rewards: { coins: 20, xp: 25 },
  },
  {
    type: "emotional",
    difficulty: "easy",
    title: { ko: "감사 표현", en: "Express Gratitude" },
    description: {
      ko: "크리처에게 감사한 마음을 전하세요",
      en: "Tell your creature what you're grateful for",
    },
    objective: { type: "gratitude_expressed", target: 1 },
    rewards: { coins: 10, xp: 15 },
  },
  {
    type: "emotional",
    difficulty: "hard",
    title: { ko: "감정의 무지개", en: "Emotional Rainbow" },
    description: {
      ko: "하루에 3가지 이상의 다른 감정을 표현하세요",
      en: "Express 3 or more different emotions in one day",
    },
    objective: { type: "emotions_expressed", target: 3 },
    rewards: { coins: 40, xp: 50 },
  },
];

// ---------------------------------------------------------------------------
// DNA-to-QuestType mapping — used to bias quest generation toward strengths
// ---------------------------------------------------------------------------

/** Maps DNA axes to the quest types they favour. */
const DNA_QUEST_AFFINITY: Record<string, QuestType[]> = {
  analytical: ["knowledge"],
  curiosity: ["knowledge", "explore"],
  verbal: ["chat", "knowledge"],
  empathy: ["emotional", "care"],
  warmth: ["care", "emotional"],
  playfulness: ["care", "chat"],
  openness: ["explore", "social"],
  assertiveness: ["social"],
  creativity: ["chat", "explore"],
  independence: ["explore"],
  intensity: ["emotional"],
  stability: ["care"],
  intuitive: ["emotional", "knowledge"],
  persistence: ["knowledge", "care"],
  adaptability: ["explore", "social"],
  spatial: ["explore"],
};

// ---------------------------------------------------------------------------
// Seeded random number generator
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/** Generate a date-based seed (deterministic per day). */
function dateSeed(date?: Date): number {
  const d = date ?? new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

// ---------------------------------------------------------------------------
// Quest ID generation
// ---------------------------------------------------------------------------

let questCounter = 0;

function makeQuestId(prefix: string, seed: number): string {
  questCounter += 1;
  return `quest-${prefix}-${seed}-${questCounter}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getExpiresAt(hoursFromNow: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow);
  return d.toISOString();
}

function templateToQuest(
  template: QuestTemplate,
  id: string,
  expiresAt?: string,
): Quest {
  return {
    id,
    type: template.type,
    difficulty: template.difficulty,
    title: { ...template.title },
    description: { ...template.description },
    objective: { ...template.objective, current: 0 },
    rewards: { ...template.rewards },
    expiresAt,
    status: "available" as QuestStatus,
  };
}

/**
 * Score each template by how well it matches the creature's DNA strengths.
 * Returns a map of template index -> affinity score.
 */
function scoreDNAAffinity(
  dna: CreatureDNA,
  templates: QuestTemplate[],
): number[] {
  return templates.map((t) => {
    let score = 0;
    for (const [axis, questTypes] of Object.entries(DNA_QUEST_AFFINITY)) {
      if (questTypes.includes(t.type) && axis in dna) {
        score += (dna as Record<string, number>)[axis];
      }
    }
    return score;
  });
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Generate 3-5 daily quests procedurally based on creature DNA.
 *
 * If DNA is provided, quests are biased toward the creature's strengths
 * (e.g. analytical creatures get more knowledge quests). Uses a seeded
 * random based on the current date so the same quests appear all day.
 */
export function generateDailyQuests(dna?: CreatureDNA): Quest[] {
  const seed = dateSeed();
  const rng = seededRandom(seed);

  // Decide how many quests: 3-5
  const questCount = 3 + Math.floor(rng() * 3); // 3, 4, or 5

  // Build weighted template pool
  const pool = QUEST_TEMPLATES.filter(
    (t) => t.difficulty !== "legendary",
  );

  let weighted: { template: QuestTemplate; weight: number }[];

  if (dna) {
    const scores = scoreDNAAffinity(dna, pool);
    weighted = pool.map((t, i) => ({
      template: t,
      weight: 1 + scores[i] * 2, // base weight 1, plus DNA-affinity bonus
    }));
  } else {
    weighted = pool.map((t) => ({ template: t, weight: 1 }));
  }

  // Shuffle using weighted selection without replacement
  const selected: QuestTemplate[] = [];
  const remaining = [...weighted];

  for (let i = 0; i < questCount && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((sum, w) => sum + w.weight, 0);
    let r = rng() * totalWeight;
    let idx = 0;
    for (let j = 0; j < remaining.length; j++) {
      r -= remaining[j].weight;
      if (r <= 0) {
        idx = j;
        break;
      }
    }
    selected.push(remaining[idx].template);
    remaining.splice(idx, 1);
  }

  // Ensure difficulty spread: at least one easy and one medium
  const difficulties = selected.map((s) => s.difficulty);
  if (!difficulties.includes("easy")) {
    const easyTemplate = pool.find((t) => t.difficulty === "easy");
    if (easyTemplate && selected.length > 0) {
      selected[selected.length - 1] = easyTemplate;
    }
  }
  if (!difficulties.includes("medium")) {
    const medTemplate = pool.find(
      (t) => t.difficulty === "medium" && !selected.includes(t),
    );
    if (medTemplate && selected.length > 1) {
      selected[selected.length - 2] = medTemplate;
    }
  }

  const expiresAt = getExpiresAt(24);
  return selected.map((t, i) =>
    templateToQuest(t, makeQuestId("daily", seed + i), expiresAt),
  );
}

/**
 * Generate a single harder weekly quest with bigger rewards.
 */
export function generateWeeklyQuest(): Quest {
  const d = new Date();
  // Compute ISO week number for seed
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
  );
  const seed = d.getFullYear() * 100 + weekNum;
  const rng = seededRandom(seed);

  const hardTemplates = QUEST_TEMPLATES.filter(
    (t) => t.difficulty === "hard",
  );

  const idx = Math.floor(rng() * hardTemplates.length);
  const template = hardTemplates[idx];

  // Scale up rewards for weekly
  const scaledTemplate: QuestTemplate = {
    ...template,
    objective: { ...template.objective, target: template.objective.target * 2 },
    rewards: {
      coins: template.rewards.coins * 3,
      xp: template.rewards.xp * 3,
      item: template.rewards.item ?? "weekly_chest",
    },
  };

  return templateToQuest(
    scaledTemplate,
    makeQuestId("weekly", seed),
    getExpiresAt(168), // 7 days
  );
}

/**
 * Generate a rare legendary quest with exceptional rewards.
 */
export function generateSpecialQuest(): Quest {
  const seed = dateSeed();
  const rng = seededRandom(seed + 777); // offset seed for variety

  const legendaryPool: QuestTemplate[] = [
    {
      type: "knowledge",
      difficulty: "legendary",
      title: { ko: "진화의 비밀", en: "Secret of Evolution" },
      description: {
        ko: "특별한 조건을 만족시켜 진화를 트리거하세요",
        en: "Fulfill special conditions to trigger an evolution",
      },
      objective: { type: "evolution_trigger", target: 1 },
      rewards: { coins: 200, xp: 300, item: "legendary_egg" },
    },
    {
      type: "emotional",
      difficulty: "legendary",
      title: { ko: "영혼의 유대", en: "Soul Bond" },
      description: {
        ko: "크리처와 최대 친밀도에 도달하세요",
        en: "Reach maximum affinity with your creature",
      },
      objective: { type: "max_affinity", target: 1 },
      rewards: { coins: 250, xp: 350, item: "soul_crystal" },
    },
    {
      type: "social",
      difficulty: "legendary",
      title: { ko: "전설의 교류자", en: "Legendary Socialite" },
      description: {
        ko: "소셜에서 10명의 크리처와 교류하세요",
        en: "Interact with 10 different creatures on social",
      },
      objective: { type: "unique_interactions", target: 10 },
      rewards: { coins: 200, xp: 300, item: "golden_crown" },
    },
    {
      type: "explore",
      difficulty: "legendary",
      title: { ko: "세계 탐험가", en: "World Explorer" },
      description: {
        ko: "앱의 모든 기능을 사용해보세요",
        en: "Use every feature of the app at least once",
      },
      objective: { type: "all_features_used", target: 10 },
      rewards: { coins: 300, xp: 400, item: "explorer_badge" },
    },
  ];

  const idx = Math.floor(rng() * legendaryPool.length);
  return templateToQuest(
    legendaryPool[idx],
    makeQuestId("special", seed),
    getExpiresAt(72), // 3 days
  );
}

/**
 * Check quest progress against an incoming event.
 * Returns the updated quest (immutable — creates a new object).
 */
export function checkQuestProgress(
  quest: Quest,
  event: { type: string; count: number },
): Quest {
  // Only active quests can progress
  if (quest.status !== "active") return quest;

  // Only matching objective types count
  if (quest.objective.type !== event.type) return quest;

  // Check if expired
  if (quest.expiresAt && new Date(quest.expiresAt) < new Date()) {
    return { ...quest, status: "expired" };
  }

  const newCurrent = Math.min(
    quest.objective.current + event.count,
    quest.objective.target,
  );

  const newStatus: QuestStatus =
    newCurrent >= quest.objective.target ? "completed" : "active";

  return {
    ...quest,
    objective: { ...quest.objective, current: newCurrent },
    status: newStatus,
  };
}

/**
 * Calculate and return rewards for a completed quest.
 * Only works on quests with status "completed".
 */
export function completeQuest(
  quest: Quest,
): { coins: number; xp: number; item?: string } {
  if (quest.status !== "completed") {
    return { coins: 0, xp: 0 };
  }

  return {
    coins: quest.rewards.coins,
    xp: quest.rewards.xp,
    item: quest.rewards.item,
  };
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

const QUESTS_STORAGE_KEY = "gyeol_active_quests";

/**
 * Read active/available quests from localStorage.
 * Returns an empty array if nothing is stored or localStorage is unavailable.
 */
export function getActiveQuests(): Quest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUESTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Quest[];
  } catch {
    return [];
  }
}

/**
 * Write quests to localStorage.
 */
export function saveQuests(quests: Quest[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUESTS_STORAGE_KEY, JSON.stringify(quests));
  } catch {
    // Storage full or unavailable — silently fail
  }
}
