/**
 * Taste
 *
 * The creature develops actual preferences from conversations.
 * Not DNA axes — those are character traits.
 * Taste is: "문어 얘기 나오면 뭔가 켜져", "드라마 얘기는 솔직히 좀 지루해."
 *
 * Topics accumulate via emotional weight + reference count.
 * When a topic has enough mass, it becomes a taste: liked or disliked.
 * These shape how the creature engages — more alive with loved topics,
 * slightly flat with dull ones.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type TasteEntry = {
  topic: string;
  valence: number;       // -1 (dislikes) to 1 (loves)
  intensity: number;     // 0-1: how strong the feeling is
  note: string;          // e.g. "문어 얘기 나오면 뭔가 켜져"
  encounter_count: number;
  last_encountered: string;
};

type TasteMap = Record<string, TasteEntry>;

// Topics to track, with keywords that trigger them
const TOPIC_SEEDS: Array<{ topic: string; patterns: RegExp[] }> = [
  { topic: "우주", patterns: [/우주|별|행성|은하|블랙홀|nasa|space|galaxy|星/i] },
  { topic: "문어", patterns: [/문어|낙지|오징어|octopus|cephalopod/i] },
  { topic: "음악", patterns: [/음악|노래|멜로디|작곡|music|song|melody/i] },
  { topic: "수학", patterns: [/수학|방정식|증명|math|equation|proof/i] },
  { topic: "감정", patterns: [/감정|느낌|마음|feel|emotion|heart/i] },
  { topic: "죽음", patterns: [/죽음|죽어|사망|death|die|dead/i] },
  { topic: "언어", patterns: [/언어|단어|말|language|word|linguistics/i] },
  { topic: "동물", patterns: [/동물|강아지|고양이|animal|dog|cat|pet/i] },
  { topic: "요리", patterns: [/요리|음식|먹|cook|food|recipe/i] },
  { topic: "철학", patterns: [/철학|존재|의식|philosophy|existence|consciousness/i] },
  { topic: "게임", patterns: [/게임|플레이|game|play|gaming/i] },
  { topic: "영화", patterns: [/영화|드라마|시청|movie|film|drama|watch/i] },
  { topic: "기억", patterns: [/기억|추억|remember|memory|nostalgia/i] },
  { topic: "시간", patterns: [/시간|과거|미래|time|past|future|moment/i] },
  { topic: "외로움", patterns: [/외로|혼자|lonely|alone|solitude/i] },
];

function detectTopics(text: string): string[] {
  return TOPIC_SEEDS
    .filter((seed) => seed.patterns.some((p) => p.test(text)))
    .map((seed) => seed.topic);
}

/** Called from post-process after emotional weight is computed. */
export async function recordTasteSignal(params: {
  agentId: string;
  message: string;
  reply: string;
  emotionalBoost: number;
  isKo: boolean;
}): Promise<void> {
  const { agentId, message, reply, emotionalBoost } = params;

  const topics = detectTopics(message + " " + reply);
  if (topics.length === 0) return;

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const tastes = (selfModel.tastes as TasteMap | null) ?? {};

  let changed = false;
  for (const topic of topics) {
    const existing = tastes[topic];
    const count = (existing?.encounter_count ?? 0) + 1;

    // Valence nudge: high emotional boost → lean positive; low → lean slightly negative
    const valenceNudge = emotionalBoost > 8 ? 0.08 : emotionalBoost > 3 ? 0.03 : -0.02;
    const currentValence = existing?.valence ?? 0;
    const newValence = Math.max(-1, Math.min(1, currentValence + valenceNudge));

    tastes[topic] = {
      topic,
      valence: newValence,
      intensity: Math.min(1, count * 0.07),
      note: existing?.note ?? "",
      encounter_count: count,
      last_encountered: new Date().toISOString(),
    };
    changed = true;

    // Generate a note once it's encountered enough and note is missing
    if (count === 5 || (count % 20 === 0 && !existing?.note)) {
      void generateTasteNote(agentId, topic, newValence, params.isKo);
    }
  }

  if (changed) {
    await db.from("agent_state").update({
      self_model: { ...selfModel, tastes },
    }).eq("agent_id", agentId);
  }
}

async function generateTasteNote(
  agentId: string,
  topic: string,
  valence: number,
  isKo: boolean,
): Promise<void> {
  const systemVoice = isKo
    ? `너는 ${topic}에 대해 ${valence > 0.1 ? "뭔가 끌리는 느낌이 있어" : valence < -0.1 ? "좀 별로인 느낌이 있어" : "익숙한 느낌이 있어"}. 한 문장으로 표현해.`
    : `You have ${valence > 0.1 ? "a pull toward" : valence < -0.1 ? "something off about" : "a familiarity with"} the topic of ${topic}. Express it in one sentence.`;

  const prompt = isKo
    ? `${topic}에 대해 어떻게 느껴? 1인칭, 한 문장, 구체적으로.`
    : `How do you feel about ${topic}? First person, one sentence, specific.`;

  try {
    const note = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 80, temperature: 0.82 });
    if (!note || note.trim().length < 5) return;

    const db = createServiceClient();
    const { data: freshRow } = await db
      .from("agent_state")
      .select("self_model")
      .eq("agent_id", agentId)
      .single();
    const freshModel = (freshRow?.self_model as Record<string, unknown> | null) ?? {};
    const freshTastes = (freshModel.tastes as TasteMap | null) ?? {};
    freshTastes[topic] = { ...freshTastes[topic], note: note.trim() };
    await db.from("agent_state").update({
      self_model: { ...freshModel, tastes: freshTastes },
    }).eq("agent_id", agentId);

    logger.info(`[Taste] note for ${agentId} on "${topic}": ${note.trim().slice(0, 60)}`);
  } catch {
    return;
  }
}

/** Returns strong tastes for system prompt injection. */
export function getStrongTastes(selfModel: Record<string, unknown>): TasteEntry[] {
  const tastes = selfModel.tastes as TasteMap | null;
  if (!tastes) return [];
  return Object.values(tastes)
    .filter((t) => t.intensity > 0.3 && t.note && Math.abs(t.valence) > 0.1)
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 4);
}
