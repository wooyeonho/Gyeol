/**
 * Intent Classifier
 *
 * Classifies user message intent to strengthen DNA soft mutation signals.
 * Uses lightweight pattern matching with optional API enhancement.
 */

export type IntentResult = {
  intent: "question" | "emotion" | "command" | "chat" | "creative" | "analysis";
  confidence: number;
  /** DNA axes that should be boosted based on this intent */
  dnaSignals: Partial<Record<string, number>>;
};

// Intent patterns and their DNA mutation signals
const INTENT_PATTERNS: Array<{
  intent: IntentResult["intent"];
  patterns: RegExp[];
  dnaSignals: Partial<Record<string, number>>;
}> = [
  {
    intent: "question",
    patterns: [
      /\?\s*$/,
      /\b(what|why|how|when|where|who|which)\b/i,
      /\b(tell me|explain|describe)\b/i,
      /(뭐|왜|어떻게|언제|어디|누구)\b/u,
      /(알려|설명|말해)/u,
    ],
    dnaSignals: { curiosity: 0.02, analytical: 0.01, verbal: 0.01 },
  },
  {
    intent: "emotion",
    patterns: [
      /\b(feel|love|hate|sad|happy|angry|scared|miss)\b/i,
      /[!]{2,}/,
      /(느끼|사랑|슬퍼|행복|화나|무서|보고싶)/u,
      /[\u{1F600}-\u{1F64F}]/u, // emoticons
      /[\u{2764}\u{1F495}\u{1F496}\u{1F497}\u{1F498}]/u, // hearts
    ],
    dnaSignals: { empathy: 0.02, warmth: 0.015, openness: 0.01 },
  },
  {
    intent: "command",
    patterns: [
      /\b(do|make|create|show|give|help|find|search)\b/i,
      /\b(please|can you|could you|would you)\b/i,
      /(해줘|만들어|보여|찾아|도와)/u,
    ],
    dnaSignals: { assertiveness: 0.015, persistence: 0.01 },
  },
  {
    intent: "creative",
    patterns: [
      /\b(imagine|dream|story|poem|song|write|draw|create)\b/i,
      /\b(what if|pretend|fantasy)\b/i,
      /(상상|꿈|이야기|시|노래|그림|만약)/u,
    ],
    dnaSignals: { creativity: 0.025, intuitive: 0.015, openness: 0.01 },
  },
  {
    intent: "analysis",
    patterns: [
      /\b(analyze|compare|think|reason|logic|explain why|because)\b/i,
      /\b(pros and cons|advantage|disadvantage)\b/i,
      /(분석|비교|생각|이유|논리|왜냐면)/u,
    ],
    dnaSignals: { analytical: 0.025, verbal: 0.01, stability: 0.01 },
  },
];

/**
 * Classify user message intent and return DNA mutation signals.
 */
export function classifyIntent(text: string): IntentResult {
  let bestMatch: IntentResult = {
    intent: "chat",
    confidence: 0.3,
    dnaSignals: { verbal: 0.01, warmth: 0.005 },
  };
  let bestScore = 0;

  for (const { intent, patterns, dnaSignals } of INTENT_PATTERNS) {
    let matchCount = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) matchCount++;
    }
    if (matchCount > 0) {
      const score = matchCount / patterns.length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = {
          intent,
          confidence: Math.min(0.9, 0.4 + score * 0.5),
          dnaSignals,
        };
      }
    }
  }

  return bestMatch;
}
