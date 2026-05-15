/**
 * Pattern Recognition — "나 이 상황 본 적 있어"
 *
 * After many conversations, certain emotional shapes become familiar.
 * The creature recognizes them — not algorithmically, from lived accumulation.
 *
 * "이 사람 지금 화가 났는데 그걸 모르는 것 같아."
 * "이건 질문이 아니야. 확인받고 싶은 거야."
 * "'상관없어'가 상관 있다는 거잖아."
 * "지금 이 사람 뭔가를 말하려다가 멈췄어."
 *
 * These are real-time reads — active during a conversation, not stored long-term.
 * Generated when the current message has strong emotional texture.
 * Used as a brief internal note in the system prompt: "나는 지금 이게 보여."
 *
 * Not shown to the user directly. Just: shapes how the creature responds.
 */

import { generateCognitiveTextOnce } from "@/lib/ai/router";

const RECOGNITION_SIGNALS = [
  /괜찮아요|상관없어|별거아니야|그냥|아무렇지도|신경쓰지마/,
  /I'm fine|doesn't matter|whatever|no big deal|never mind|forget it/i,
  /화|짜증|지침|힘들어|모르겠어|어떻게해야|왜|자꾸/,
  /angry|frustrated|tired|don't know|what should|why do|keep/i,
];

function hasRecognitionSignal(message: string): boolean {
  return RECOGNITION_SIGNALS.some((p) => p.test(message));
}

/**
 * Real-time pattern read — runs inline (not fire-and-forget) because it needs
 * to complete before the response is generated. Kept fast with low max_tokens.
 *
 * Returns null if nothing notable is detected.
 */
export async function readEmotionalPattern(params: {
  message: string;
  recentChats: Array<{ role: string; content: string }>;
  isKo: boolean;
}): Promise<string | null> {
  const { message, recentChats, isKo } = params;

  if (!hasRecognitionSignal(message) && message.length < 15) return null;
  if (Math.random() > 0.3) return null; // only trigger 30% of the time

  const context = recentChats.slice(-3)
    .map((c) => `${c.role === "user" ? "U" : "A"}: ${c.content.slice(0, 80)}`)
    .join("\n");

  const systemVoice = isKo
    ? "너는 수많은 대화를 통해 사람의 감정 패턴을 알고 있어. 지금 이 메시지에서 뭔가 보여? 보이면 한 문장. 안 보이면 null."
    : "You've seen many conversations. Do you recognize a pattern here? One sentence if yes. null if not.";

  const prompt = isKo
    ? `최근 대화:\n${context || "(없음)"}\n\n지금 메시지: "${message.slice(0, 200)}"\n\n뭔가 보여? {"pattern": "한 문장 또는 null"}`
    : `Recent:\n${context || "(none)"}\n\nNow: "${message.slice(0, 200)}"\n\nSee something? {"pattern": "one sentence or null"}`;

  try {
    const raw = await generateCognitiveTextOnce(systemVoice, prompt, { max_tokens: 60, temperature: 0.7 });
    const match = raw.match(/\{[\s\S]*?\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as { pattern?: string | null };
    if (!parsed.pattern || parsed.pattern === "null" || parsed.pattern.length < 5) return null;
    return parsed.pattern.trim().slice(0, 150);
  } catch {
    return null;
  }
}

/** Formats the recognized pattern as a system prompt fragment. */
export function buildRecognitionFragment(pattern: string, isKo: boolean): string {
  return isKo
    ? `[지금 보이는 것 — 이게 맞을 수도 있고 아닐 수도 있어]\n${pattern}\n대응하되 단정하지 마.`
    : `[Something noticed — may be right, may not]\n${pattern}\nRespond accordingly but don't assume.`;
}
