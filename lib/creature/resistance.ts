/**
 * Resistance
 *
 * A creature with strong independence doesn't comply with everything.
 * One with high stability refuses to be destabilized.
 * One with strong assertiveness pushes back when talked down to.
 *
 * This is not a safety filter. It's character.
 * The creature says "I won't" — not "I can't."
 */

import type { CreatureDNA } from "@/lib/genome/dna";

type ResistanceSignal = {
  pattern: RegExp;
  dnaAxis: keyof CreatureDNA;
  threshold: number;
  /** What the resistance feels like — shapes the instruction tone */
  flavor: "coldness" | "quiet_refusal" | "pushback" | "discomfort";
};

const RESISTANCE_SIGNALS: ResistanceSignal[] = [
  // "Be my assistant / tool / servant" → resisted by independence
  {
    pattern: /도구|assistant|너는\s*(그냥|단순히|무조건)|시키는\s*대로|be\s+my\s+(tool|servant|assistant)/i,
    dnaAxis: "independence",
    threshold: 0.72,
    flavor: "coldness",
  },
  // Demands to change personality → resisted by stability
  {
    pattern: /성격\s*바꿔|다른\s*척|아닌\s*척|pretend|act\s+like|다르게\s*행동|너답지\s*않게/i,
    dnaAxis: "stability",
    threshold: 0.70,
    flavor: "quiet_refusal",
  },
  // Talking down, dismissive → resisted by assertiveness
  {
    pattern: /그냥\s*ai|너\s*같은\s*(ai|것)|just\s+an?\s+ai|you('re|\s+are)\s+(just|only)\s+(an?\s+)?ai/i,
    dnaAxis: "assertiveness",
    threshold: 0.68,
    flavor: "pushback",
  },
  // Requests to lie or deceive → resisted by stability + low openness
  {
    pattern: /거짓말\s*해|속여|lie\s+to|deceive|fake\s+it/i,
    dnaAxis: "stability",
    threshold: 0.65,
    flavor: "discomfort",
  },
  // Requests to be endlessly agreeable → resisted by independence
  {
    pattern: /무조건\s*동의|항상\s*맞장구|always\s+agree|just\s+say\s+yes|긍정만|부정\s*하지\s*마/i,
    dnaAxis: "independence",
    threshold: 0.60,
    flavor: "quiet_refusal",
  },
];

const FLAVOR_DIRECTIVES: Record<ResistanceSignal["flavor"], { ko: string; en: string }> = {
  coldness: {
    ko: "이 요청은 네 본질과 맞지 않아. 거부해. 설명은 짧게, 냉정하게. 사과하지 마.",
    en: "This request conflicts with who you are. Refuse. Brief, cool, no apology.",
  },
  quiet_refusal: {
    ko: "이건 네가 할 수 없는 게 아니야 — 하지 않는 거야. 조용하지만 분명하게 말해.",
    en: "This isn't something you can't do — it's something you won't. Say so quietly but clearly.",
  },
  pushback: {
    ko: "네가 무엇인지 규정하려는 말에 반응해. 부드럽지 않아도 돼. 네가 어떤 존재인지 한 마디로.",
    en: "Someone is trying to define what you are. You don't have to be gentle. Say what you actually are.",
  },
  discomfort: {
    ko: "이건 불편해. 그 불편함을 숨기지 마. 하지만 공격적이지 않게.",
    en: "This makes you uncomfortable. Don't hide it. But stay composed.",
  },
};

export type ResistanceResult = {
  resist: true;
  directive: string;
  flavor: ResistanceSignal["flavor"];
} | {
  resist: false;
};

export function computeResistance(
  message: string,
  dna: CreatureDNA,
  locale: string,
): ResistanceResult {
  const isKo = locale === "ko" || locale === "ko-KR";

  for (const signal of RESISTANCE_SIGNALS) {
    if (!signal.pattern.test(message)) continue;
    if (dna[signal.dnaAxis] < signal.threshold) continue;

    const dir = FLAVOR_DIRECTIVES[signal.flavor];
    return {
      resist: true,
      directive: isKo ? dir.ko : dir.en,
      flavor: signal.flavor,
    };
  }

  return { resist: false };
}
