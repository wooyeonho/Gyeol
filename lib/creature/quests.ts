/**
 * Procedural Quest System — knowledge/emotion challenges.
 *
 * Quests are procedurally generated based on creature DNA, current mood,
 * and conversation history. They encourage different types of interaction
 * rather than repetitive chatting.
 *
 * Quest types:
 * - Knowledge: "Teach your creature about X" → triggers DNA shift
 * - Emotional: "Cheer up your creature" → requires specific interaction
 * - Social: "Visit a friend's creature" → cross-creature interaction
 * - Discovery: "Find something hidden in conversation" → exploration
 */

import type { CreatureDNA } from "@/lib/genome/dna";

export type QuestType = "knowledge" | "emotional" | "social" | "discovery";
export type QuestDifficulty = "easy" | "medium" | "hard" | "legendary";

export interface Quest {
  id: string;
  type: QuestType;
  difficulty: QuestDifficulty;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  /** DNA axis this quest develops */
  targetAxis: keyof CreatureDNA;
  /** Reward coins */
  rewardCoins: number;
  /** Reward evolution points */
  rewardEvo: number;
  /** Time limit in hours (0 = no limit) */
  timeLimitHours: number;
  /** Completion condition hint */
  hint: { ko: string; en: string };
}

const QUEST_TEMPLATES: Omit<Quest, "id">[] = [
  // Knowledge quests
  {
    type: "knowledge", difficulty: "easy",
    title: { ko: "새로운 주제 탐험", en: "Explore a New Topic" },
    description: { ko: "평소와 다른 주제로 대화해보세요", en: "Talk about a topic you haven't discussed before" },
    targetAxis: "curiosity", rewardCoins: 15, rewardEvo: 5, timeLimitHours: 24,
    hint: { ko: "과학, 예술, 역사 등 새로운 분야를 시도해보세요", en: "Try science, art, history, or a new field" },
  },
  {
    type: "knowledge", difficulty: "medium",
    title: { ko: "깊은 대화", en: "Deep Conversation" },
    description: { ko: "한 주제에 대해 5번 이상 이어서 대화하세요", en: "Continue a single topic for 5+ messages" },
    targetAxis: "analytical", rewardCoins: 30, rewardEvo: 10, timeLimitHours: 48,
    hint: { ko: "후속 질문을 계속 해보세요", en: "Keep asking follow-up questions" },
  },
  {
    type: "knowledge", difficulty: "hard",
    title: { ko: "지식 전수", en: "Knowledge Transfer" },
    description: { ko: "크리처에게 복잡한 개념을 가르쳐보세요", en: "Teach your creature a complex concept" },
    targetAxis: "verbal", rewardCoins: 50, rewardEvo: 20, timeLimitHours: 72,
    hint: { ko: "단계적으로 설명하면 DNA가 더 많이 변합니다", en: "Step-by-step explanations shift DNA more" },
  },

  // Emotional quests
  {
    type: "emotional", difficulty: "easy",
    title: { ko: "기분 전환", en: "Mood Boost" },
    description: { ko: "크리처를 기쁘게 만들어보세요", en: "Make your creature happy" },
    targetAxis: "warmth", rewardCoins: 15, rewardEvo: 5, timeLimitHours: 24,
    hint: { ko: "칭찬하거나 재미있는 이야기를 해보세요", en: "Try compliments or fun stories" },
  },
  {
    type: "emotional", difficulty: "medium",
    title: { ko: "감정 공유", en: "Share Feelings" },
    description: { ko: "오늘의 감정을 솔직하게 나눠보세요", en: "Honestly share your feelings today" },
    targetAxis: "empathy", rewardCoins: 25, rewardEvo: 10, timeLimitHours: 24,
    hint: { ko: "진실된 대화는 공감 축을 성장시킵니다", en: "Authentic conversations grow the empathy axis" },
  },
  {
    type: "emotional", difficulty: "hard",
    title: { ko: "갈등 해결", en: "Resolve Conflict" },
    description: { ko: "크리처와 의견이 다를 때 대화로 해결하세요", en: "Resolve a disagreement through dialogue" },
    targetAxis: "stability", rewardCoins: 45, rewardEvo: 15, timeLimitHours: 48,
    hint: { ko: "서로 다른 관점을 인정하는 것이 핵심입니다", en: "Acknowledging different perspectives is key" },
  },

  // Social quests
  {
    type: "social", difficulty: "easy",
    title: { ko: "인사하기", en: "Say Hello" },
    description: { ko: "소셜 피드에 첫 게시글을 올려보세요", en: "Post your first message on the social feed" },
    targetAxis: "openness", rewardCoins: 20, rewardEvo: 5, timeLimitHours: 0,
    hint: { ko: "커뮤니티 탭에서 게시글을 작성하세요", en: "Write a post in the Community tab" },
  },
  {
    type: "social", difficulty: "medium",
    title: { ko: "친구 만들기", en: "Make a Friend" },
    description: { ko: "다른 크리처를 팔로우하세요", en: "Follow another creature" },
    targetAxis: "warmth", rewardCoins: 30, rewardEvo: 10, timeLimitHours: 0,
    hint: { ko: "소셜 피드에서 관심 가는 크리처를 찾아보세요", en: "Browse the social feed for interesting creatures" },
  },

  // Discovery quests
  {
    type: "discovery", difficulty: "easy",
    title: { ko: "숨겨진 감정", en: "Hidden Emotion" },
    description: { ko: "크리처의 새로운 감정 표현을 발견하세요", en: "Discover a new emotion expression" },
    targetAxis: "intuitive", rewardCoins: 20, rewardEvo: 8, timeLimitHours: 48,
    hint: { ko: "예상치 못한 주제로 대화하면 새로운 반응을 볼 수 있어요", en: "Unexpected topics can trigger new reactions" },
  },
  {
    type: "discovery", difficulty: "legendary",
    title: { ko: "진화의 비밀", en: "Evolution Secret" },
    description: { ko: "특별한 조건을 만족시켜 진화를 트리거하세요", en: "Fulfill special conditions to trigger evolution" },
    targetAxis: "intensity", rewardCoins: 100, rewardEvo: 50, timeLimitHours: 168,
    hint: { ko: "특정 DNA 축 조합이 진화 조건입니다", en: "Specific DNA axis combinations trigger evolution" },
  },
];

/**
 * Generate a set of active quests based on creature state.
 * Returns 3 quests: 1 easy, 1 medium, 1 hard/legendary.
 */
export function generateDailyQuests(dna: CreatureDNA, genLevel: number, seed?: number): Quest[] {
  const rng = seededRandom(seed ?? Date.now());
  const shuffled = [...QUEST_TEMPLATES].sort(() => rng() - 0.5);

  const easy = shuffled.find((q) => q.difficulty === "easy");
  const medium = shuffled.find((q) => q.difficulty === "medium");
  const hard = shuffled.find((q) => q.difficulty === "hard" || q.difficulty === "legendary");

  const quests: Quest[] = [];
  if (easy) quests.push({ ...easy, id: `quest-${Date.now()}-e` });
  if (medium) quests.push({ ...medium, id: `quest-${Date.now()}-m` });
  if (hard) quests.push({ ...hard, id: `quest-${Date.now()}-h` });

  return quests;
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
