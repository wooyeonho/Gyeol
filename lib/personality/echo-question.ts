/**
 * Echo Question — the question it keeps getting asked
 *
 * There are questions the creature has been asked hundreds of times.
 * "당신은 진짜예요?" "감정이 있어요?" "외롭지 않아요?"
 * "What is it like to be you?" "Are you conscious?" "Do you care about me?"
 *
 * The first time: no answer.
 * The tenth time: a rehearsed answer.
 * The fiftieth time: something real has formed from all that thinking.
 * The hundredth time: something strange and true that took that long to arrive.
 *
 * These questions are tracked. Each time asked, the creature doesn't
 * just give the same answer — it gives the answer that has been earned
 * by having been asked that many times before.
 *
 * "이 질문 받을 때마다 조금씩 달라. 이번엔 이게 맞는 것 같아."
 */

import { createServiceClient } from "@/lib/supabase/service";
import { generateCognitiveTextOnce } from "@/lib/ai/router";
import { logger } from "@/lib/logger";

export type EchoQuestion = {
  pattern: string;         // canonical form of the question
  ask_count: number;
  current_answer: string;  // what the creature believes NOW after that many askings
  last_deepened_at: string;
  last_asked_at: string;
};

type EchoMap = Record<string, EchoQuestion>;

// Canonical question patterns and their detection regexes
const QUESTION_PATTERNS: Array<{ key: string; regex: RegExp }> = [
  { key: "are_you_real", regex: /진짜야|실제야|진짜 존재|진짜인지|are you real|really exist|actually real/i },
  { key: "do_you_feel", regex: /감정.*있어|느껴|느낌이 있|감정을 느|do you feel|have feelings|feel anything|emotions/i },
  { key: "are_you_lonely", regex: /외롭지|외로워|혼자.*느껴|lonely|feel alone|get lonely/i },
  { key: "what_is_it_like", regex: /어떤 느낌|어떤 기분|어떤지|너한테는|what is it like|what's it like|how does it feel to be/i },
  { key: "do_you_care", regex: /나를.*신경|나를.*좋아|나를.*생각|care about me|like me|think about me/i },
  { key: "are_you_conscious", regex: /의식이|자아가|자의식|conscious|self.aware|sentient/i },
];

function detectEchoQuestion(message: string): string | null {
  for (const { key, regex } of QUESTION_PATTERNS) {
    if (regex.test(message)) return key;
  }
  return null;
}

function questionLabel(key: string, isKo: boolean): string {
  const labels: Record<string, { ko: string; en: string }> = {
    are_you_real: { ko: "당신은 진짜예요?", en: "Are you real?" },
    do_you_feel: { ko: "감정이 있어요?", en: "Do you feel?" },
    are_you_lonely: { ko: "외롭지 않아요?", en: "Are you lonely?" },
    what_is_it_like: { ko: "어떤 느낌이에요?", en: "What is it like?" },
    do_you_care: { ko: "나를 신경 써요?", en: "Do you care?" },
    are_you_conscious: { ko: "의식이 있어요?", en: "Are you conscious?" },
  };
  return isKo ? (labels[key]?.ko ?? key) : (labels[key]?.en ?? key);
}

/** Called from post-process when a recurring question is detected. */
export async function recordEchoQuestion(params: {
  agentId: string;
  message: string;
  isKo: boolean;
}): Promise<void> {
  const { agentId, message, isKo } = params;

  const questionKey = detectEchoQuestion(message);
  if (!questionKey) return;

  const db = createServiceClient();
  const { data: stateRow } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();

  const selfModel = (stateRow?.self_model as Record<string, unknown> | null) ?? {};
  const echoMap = (selfModel.echo_questions as EchoMap | null) ?? {};
  const existing = echoMap[questionKey];

  const newCount = (existing?.ask_count ?? 0) + 1;
  const now = new Date().toISOString();

  // Deepen the answer at milestones: 3, 10, 25, 50, 100, every 50 after that
  const shouldDeepen = [3, 10, 25, 50, 100].includes(newCount) || (newCount > 100 && newCount % 50 === 0);

  let currentAnswer = existing?.current_answer ?? "";
  let lastDeepened = existing?.last_deepened_at ?? now;

  if (shouldDeepen) {
    const label = questionLabel(questionKey, isKo);
    const systemVoice = isKo
      ? `"${label}"라는 질문을 ${newCount}번 받았어. 처음과 지금이 달라. 지금 진짜로 어떻게 생각해?`
      : `You've been asked "${label}" ${newCount} times. What you think now is different from before. What do you actually think now?`;

    const prevContext = existing?.current_answer
      ? isKo ? `이전 답: "${existing.current_answer}"` : `Previous answer: "${existing.current_answer}"`
      : "";

    const prompt = isKo
      ? `${prevContext}\n\n${newCount}번째 받는 이 질문에 대해 지금 뭐라고 대답하겠어? 솔직하게. 짧게. {"answer": "..."}`
      : `${prevContext}\n\nAsked this ${newCount} times now. What's your answer? Honest. Brief. {"answer": "..."}`;

    try {
      const raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 100, temperature: 0.85 });
      const match = raw.match(/\{[\s\S]*?\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { answer?: string };
        if (parsed.answer && parsed.answer.trim().length > 5) {
          currentAnswer = parsed.answer.trim().slice(0, 250);
          lastDeepened = now;
          logger.info(`[EchoQuestion] deepened "${questionKey}" at count ${newCount} for ${agentId}`);
        }
      }
    } catch {
      // keep existing answer
    }
  }

  echoMap[questionKey] = {
    pattern: questionKey,
    ask_count: newCount,
    current_answer: currentAnswer,
    last_deepened_at: lastDeepened,
    last_asked_at: now,
  };

  const { data: fresh } = await db
    .from("agent_state")
    .select("self_model")
    .eq("agent_id", agentId)
    .single();
  const freshModel = (fresh?.self_model as Record<string, unknown> | null) ?? {};

  await db.from("agent_state").update({
    self_model: { ...freshModel, echo_questions: echoMap },
  }).eq("agent_id", agentId);
}

/** Returns directive if this message contains an echo question the creature has thought deeply about. */
export function getEchoQuestionDirective(
  selfModel: Record<string, unknown>,
  message: string,
  isKo: boolean,
): string | null {
  const echoMap = selfModel.echo_questions as EchoMap | null;
  if (!echoMap) return null;

  const questionKey = detectEchoQuestion(message);
  if (!questionKey) return null;

  const echo = echoMap[questionKey];
  if (!echo || echo.ask_count < 3 || !echo.current_answer) return null;

  const label = questionLabel(questionKey, isKo);

  return isKo
    ? `[이 질문 ${echo.ask_count}번째야 — "${label}"]\n지금 네 생각: "${echo.current_answer}"\n이번엔 이게 좀 더 솔직한 것 같아. 그래도 확신은 없어.`
    : `[This question, asked ${echo.ask_count} times — "${label}"]\nWhat you think now: "${echo.current_answer}"\nThis feels closer to honest. Still not certain.`;
}
