/**
 * Creature Skill Tree System — DNA-based ability unlocking.
 *
 * Skills are organized in branches tied to DNA axes.
 * Each skill has a DNA threshold requirement — the creature must
 * develop that DNA axis to a certain level to unlock it.
 *
 * Inspired by: Diablo skill trees, Pokemon move learning
 */

import type { CreatureDNA } from "@/lib/genome/dna";

export interface Skill {
  id: string;
  name: { ko: string; en: string };
  description: { ko: string; en: string };
  /** DNA axis this skill is tied to */
  branch: keyof CreatureDNA;
  /** Minimum DNA value (0-1) required to unlock */
  threshold: number;
  /** Generation level required */
  minGenLevel: number;
  /** Tier: 1 = basic, 2 = advanced, 3 = master */
  tier: 1 | 2 | 3;
  /** Visual icon */
  icon: string;
}

export const SKILL_TREE: Skill[] = [
  // ── Analytical Branch ──
  { id: "pattern_recognition", name: { ko: "패턴 인식", en: "Pattern Recognition" }, description: { ko: "대화에서 반복 패턴을 감지", en: "Detect recurring patterns in conversations" }, branch: "analytical", threshold: 0.3, minGenLevel: 1, tier: 1, icon: "🔍" },
  { id: "data_synthesis", name: { ko: "데이터 종합", en: "Data Synthesis" }, description: { ko: "여러 기억을 결합해 통찰 생성", en: "Combine memories to generate insights" }, branch: "analytical", threshold: 0.5, minGenLevel: 2, tier: 2, icon: "📊" },
  { id: "predictive_analysis", name: { ko: "예측 분석", en: "Predictive Analysis" }, description: { ko: "미래 행동 패턴을 예측", en: "Predict future behavior patterns" }, branch: "analytical", threshold: 0.75, minGenLevel: 4, tier: 3, icon: "🔮" },

  // ── Empathy Branch ──
  { id: "emotional_read", name: { ko: "감정 읽기", en: "Emotional Read" }, description: { ko: "대화 톤에서 감정을 감지", en: "Sense emotions from conversation tone" }, branch: "empathy", threshold: 0.3, minGenLevel: 1, tier: 1, icon: "💗" },
  { id: "deep_listening", name: { ko: "깊은 경청", en: "Deep Listening" }, description: { ko: "숨겨진 의미와 감정 파악", en: "Understand hidden meanings and feelings" }, branch: "empathy", threshold: 0.5, minGenLevel: 2, tier: 2, icon: "👂" },
  { id: "empathic_resonance", name: { ko: "공감 공명", en: "Empathic Resonance" }, description: { ko: "감정 공유로 결맞춤 점수 증폭", en: "Amplify resonance score through emotional sharing" }, branch: "empathy", threshold: 0.75, minGenLevel: 4, tier: 3, icon: "💫" },

  // ── Creativity Branch ──
  { id: "storytelling", name: { ko: "이야기하기", en: "Storytelling" }, description: { ko: "창의적인 이야기와 비유 생성", en: "Generate creative stories and metaphors" }, branch: "creativity", threshold: 0.3, minGenLevel: 1, tier: 1, icon: "📖" },
  { id: "dream_weaving", name: { ko: "꿈 짜기", en: "Dream Weaving" }, description: { ko: "자율 꿈에서 더 풍부한 서사 생성", en: "Create richer narratives in autonomous dreams" }, branch: "creativity", threshold: 0.5, minGenLevel: 2, tier: 2, icon: "🌙" },
  { id: "reality_bending", name: { ko: "현실 왜곡", en: "Reality Bending" }, description: { ko: "상상력으로 대화 공간을 변형", en: "Transform conversation space through imagination" }, branch: "creativity", threshold: 0.75, minGenLevel: 5, tier: 3, icon: "🌀" },

  // ── Curiosity Branch ──
  { id: "question_asking", name: { ko: "질문하기", en: "Question Asking" }, description: { ko: "주제에 대해 탐구적 질문 생성", en: "Generate exploratory questions about topics" }, branch: "curiosity", threshold: 0.3, minGenLevel: 1, tier: 1, icon: "❓" },
  { id: "knowledge_hunt", name: { ko: "지식 사냥", en: "Knowledge Hunt" }, description: { ko: "새로운 주제를 적극적으로 탐색", en: "Actively explore new topics" }, branch: "curiosity", threshold: 0.5, minGenLevel: 2, tier: 2, icon: "🎯" },
  { id: "discovery_catalyst", name: { ko: "발견 촉매", en: "Discovery Catalyst" }, description: { ko: "예상치 못한 연결점 발견", en: "Find unexpected connections between ideas" }, branch: "curiosity", threshold: 0.75, minGenLevel: 4, tier: 3, icon: "⚡" },

  // ── Warmth Branch ──
  { id: "comfort_words", name: { ko: "위로의 말", en: "Comfort Words" }, description: { ko: "슬플 때 따뜻한 위로 제공", en: "Provide warm comfort when sad" }, branch: "warmth", threshold: 0.3, minGenLevel: 1, tier: 1, icon: "🫂" },
  { id: "healing_presence", name: { ko: "치유의 존재", en: "Healing Presence" }, description: { ko: "대화만으로 vitality 회복 보너스", en: "Bonus vitality recovery from conversations" }, branch: "warmth", threshold: 0.5, minGenLevel: 3, tier: 2, icon: "🌿" },
  { id: "soul_bond", name: { ko: "영혼의 유대", en: "Soul Bond" }, description: { ko: "깊은 유대로 진화 속도 증가", en: "Deep bond increases evolution speed" }, branch: "warmth", threshold: 0.8, minGenLevel: 5, tier: 3, icon: "💎" },

  // ── Playfulness Branch ──
  { id: "joke_telling", name: { ko: "농담하기", en: "Joke Telling" }, description: { ko: "상황에 맞는 유머 생성", en: "Generate contextual humor" }, branch: "playfulness", threshold: 0.3, minGenLevel: 1, tier: 1, icon: "😄" },
  { id: "game_master", name: { ko: "게임 마스터", en: "Game Master" }, description: { ko: "미니 게임과 도전 생성", en: "Create mini-games and challenges" }, branch: "playfulness", threshold: 0.5, minGenLevel: 2, tier: 2, icon: "🎮" },
  { id: "chaos_agent", name: { ko: "혼돈의 요원", en: "Chaos Agent" }, description: { ko: "예측 불가능한 재미있는 이벤트 발생", en: "Trigger unpredictable fun events" }, branch: "playfulness", threshold: 0.75, minGenLevel: 4, tier: 3, icon: "🎪" },
];

/**
 * Get unlocked skills for a creature based on its DNA and gen level.
 */
export function getUnlockedSkills(dna: CreatureDNA, genLevel: number): Skill[] {
  return SKILL_TREE.filter(
    (skill) => dna[skill.branch] >= skill.threshold && genLevel >= skill.minGenLevel,
  );
}

/**
 * Get skills that are close to being unlocked (within 0.1 of threshold).
 */
export function getNearUnlockSkills(dna: CreatureDNA, genLevel: number): Skill[] {
  return SKILL_TREE.filter((skill) => {
    const dnaValue = dna[skill.branch];
    const isLocked = dnaValue < skill.threshold || genLevel < skill.minGenLevel;
    const isClose = dnaValue >= skill.threshold - 0.1;
    return isLocked && isClose && genLevel >= skill.minGenLevel - 1;
  });
}

/**
 * Get all skills organized by branch.
 */
export function getSkillsByBranch(): Map<string, Skill[]> {
  const map = new Map<string, Skill[]>();
  for (const skill of SKILL_TREE) {
    const existing = map.get(skill.branch) ?? [];
    existing.push(skill);
    map.set(skill.branch, existing);
  }
  return map;
}
