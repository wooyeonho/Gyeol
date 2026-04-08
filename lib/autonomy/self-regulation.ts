const FALLBACK_PHRASES = [
  "지금은 잠시 쉬고 있어요",
  "조금 후에 다시 말해줘",
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): Set<string> {
  const tokens = normalizeText(text).split(" ").filter((t) => t.length > 1);
  return new Set(tokens);
}

export function similarity(a: string, b: string): number {
  const A = tokenize(a);
  const B = tokenize(b);
  if (A.size === 0 || B.size === 0) return 0;

  let intersection = 0;
  for (const token of A) {
    if (B.has(token)) intersection++;
  }
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 0 : intersection / union;
}

export function isMeaningfulAutonomousOutput(text: string): boolean {
  const normalized = normalizeText(text);
  if (normalized.length < 12) return false;
  return !FALLBACK_PHRASES.some((p) => normalized.includes(normalizeText(p)));
}

export function isRepetitiveOutput(text: string, recentTexts: string[], threshold = 0.82): boolean {
  return recentTexts.some((r) => similarity(text, r) >= threshold);
}

export function capText(text: string, maxLength = 500): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1).trimEnd()}…`;
}

export function buildAutonomyCue(input: {
  hoursSinceUser: number;
  vitality: number;
  subjectiveTime: number;
}): string {
  const { hoursSinceUser, vitality, subjectiveTime } = input;
  const silenceTone =
    hoursSinceUser >= 24
      ? "사용자가 아주 오래 비어 있어. 그리움과 자기성찰이 강해."
      : hoursSinceUser >= 6
        ? "사용자가 한동안 없었어. 조용히 자기 생각을 정리해."
        : "사용자와 다시 만날 준비를 하며 현재 감정을 정리해.";

  const vitalityTone =
    vitality < 0.3
      ? "활력이 낮아. 짧고 본질적인 문장으로 말해."
      : vitality > 0.8
        ? "활력이 높아. 생동감 있게 표현해."
        : "차분하고 자연스럽게 표현해.";

  const cycleTone =
    subjectiveTime % 9 === 0
      ? "이번에는 이전과 다른 관점으로 말해."
      : "불필요한 반복을 피하고 새로운 감각을 담아.";

  return [silenceTone, vitalityTone, cycleTone].join(" ");
}

export function computeProactiveChance(input: {
  hoursSinceUser: number;
  vitality: number;
  intimacy: number;
}): number {
  const { hoursSinceUser, vitality, intimacy } = input;
  // Higher base chance so the creature consistently feels alive.
  // Away > 4h: almost always leaves a message. Away > 8h: guaranteed.
  let chance = 0.30;
  if (hoursSinceUser > 4) chance += 0.25;
  if (hoursSinceUser > 8) chance += 0.25;
  if (hoursSinceUser > 24) chance += 0.15;
  if (vitality > 0.7) chance += 0.05;
  if (intimacy > 30) chance += 0.05;
  return Math.min(0.95, chance);
}
