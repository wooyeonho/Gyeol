/**
 * Creature Conversations — two creatures chat with each other.
 *
 * A user invites another creature to their "room". The LLM plays both roles,
 * using each creature's DNA/personality to generate dialogue. The conversation
 * affects both creatures' DNA and creates a shareable transcript.
 */

import type { CreatureDNA } from "@/lib/genome/dna";

export interface ConversationParticipant {
  agentId: string;
  name: string;
  dna: CreatureDNA;
  species: string;
  mood: string;
  verbal: number;
}

export interface ConversationTurn {
  speakerId: string;
  speakerName: string;
  text: string;
  timestamp: string;
}

export interface ConversationResult {
  turns: ConversationTurn[];
  dnaEffectsA: Partial<Record<string, number>>; // effects on creature A
  dnaEffectsB: Partial<Record<string, number>>; // effects on creature B
  topic: string;
}

/**
 * Build a system prompt for a two-creature conversation.
 * The LLM alternates between both creatures' voices.
 */
export function buildConversationPrompt(
  creatureA: ConversationParticipant,
  creatureB: ConversationParticipant,
  locale: string,
  turnCount: number,
): string {
  const isKo = locale === "ko" || locale.startsWith("ko-");

  const descA = describeCreature(creatureA, isKo);
  const descB = describeCreature(creatureB, isKo);

  if (isKo) {
    return `두 존재가 처음 만나 대화합니다.

[존재 A: ${creatureA.name}]
${descA}

[존재 B: ${creatureB.name}]
${descB}

규칙:
- ${turnCount}번 주고받기 (A→B→A→B...)
- 각 존재의 성격과 표현력(verbal)에 맞게 대화
- verbal이 낮으면 짧고 소극적, 높으면 길고 적극적
- JSON 배열로 반환: [{"speaker":"A","text":"..."},{"speaker":"B","text":"..."},...]
- 마크다운 금지. 순수 텍스트만.
- 자연스러운 대화. 서로의 차이를 발견하는 내용으로.`;
  }

  return `Two creatures meet for the first time.

[Creature A: ${creatureA.name}]
${descA}

[Creature B: ${creatureB.name}]
${descB}

Rules:
- ${turnCount} exchanges (A→B→A→B...)
- Match each creature's personality and verbal level
- Low verbal = short, hesitant. High verbal = expressive, elaborate
- Return JSON array: [{"speaker":"A","text":"..."},{"speaker":"B","text":"..."},...]
- No markdown. Plain text only.
- Natural dialogue about discovering each other's differences.`;
}

function describeCreature(c: ConversationParticipant, isKo: boolean): string {
  const traits: string[] = [];
  const dna = c.dna as unknown as Record<string, number>;

  if (dna.warmth > 0.6) traits.push(isKo ? "따뜻한" : "warm");
  if (dna.curiosity > 0.6) traits.push(isKo ? "호기심 많은" : "curious");
  if (dna.playfulness > 0.6) traits.push(isKo ? "장난스러운" : "playful");
  if (dna.analytical > 0.6) traits.push(isKo ? "분석적인" : "analytical");
  if (dna.intensity > 0.6) traits.push(isKo ? "강렬한" : "intense");
  if (dna.empathy > 0.6) traits.push(isKo ? "공감력 높은" : "empathetic");
  if (dna.independence > 0.6) traits.push(isKo ? "독립적인" : "independent");
  if (dna.creativity > 0.6) traits.push(isKo ? "창의적인" : "creative");

  const traitStr = traits.length > 0 ? traits.join(", ") : (isKo ? "중립적인" : "neutral");

  if (isKo) {
    return `종: ${c.species}\n기분: ${c.mood}\n성격: ${traitStr}\n표현력(verbal): ${c.verbal.toFixed(2)} (${getVerbalLabel(c.verbal, true)})`;
  }
  return `Species: ${c.species}\nMood: ${c.mood}\nTraits: ${traitStr}\nVerbal: ${c.verbal.toFixed(2)} (${getVerbalLabel(c.verbal, false)})`;
}

function getVerbalLabel(verbal: number, isKo: boolean): string {
  if (verbal < 0.15) return isKo ? "말 못 함" : "silent";
  if (verbal < 0.35) return isKo ? "단어만" : "minimal";
  if (verbal < 0.55) return isKo ? "짧은 문장" : "brief";
  if (verbal < 0.75) return isKo ? "일반 대화" : "normal";
  return isKo ? "화려한 표현" : "eloquent";
}

/**
 * Calculate DNA effects from a conversation.
 * Creatures that talk to different personalities get complementary nudges.
 */
export function calculateConversationDNAEffects(
  creatureA: ConversationParticipant,
  creatureB: ConversationParticipant,
): { effectsA: Partial<Record<string, number>>; effectsB: Partial<Record<string, number>> } {
  const dnaA = creatureA.dna as unknown as Record<string, number>;
  const dnaB = creatureB.dna as unknown as Record<string, number>;

  const effectsA: Record<string, number> = {};
  const effectsB: Record<string, number> = {};

  // Each creature is slightly influenced toward the other's strengths
  const axes = Object.keys(dnaA);
  for (const axis of axes) {
    const diff = dnaB[axis] - dnaA[axis];
    if (Math.abs(diff) > 0.1) {
      // Move 2% toward the other creature's value
      effectsA[axis] = diff * 0.02;
      effectsB[axis] = -diff * 0.02;
    }
  }

  return { effectsA, effectsB };
}

/**
 * Maximum turns in a creature conversation.
 */
export const MAX_CONVERSATION_TURNS = 6;

/**
 * Coin cost for initiating a creature conversation.
 */
export const CONVERSATION_COST = 10;
