/**
 * Preference Memory — BG3-style narrative personalization.
 *
 * Extracts user preferences from conversation patterns and builds
 * a persistent profile that influences creature responses.
 * Like BG3 companion approval: every conversation choice shapes the relationship.
 */

export interface UserPreferences {
  /** Detected age group from conversation style */
  age_group: "child" | "teen" | "adult" | "unknown";
  /** Preferred speaking style */
  speaking_style: "casual" | "formal" | "playful" | "poetic" | "terse" | "unknown";
  /** Detected interests from conversation topics */
  interests: string[];
  /** Communication preference */
  communication_pref: "emotional" | "analytical" | "creative" | "practical" | "unknown";
  /** Preferred response length */
  response_length: "short" | "medium" | "long" | "unknown";
  /** Confidence score 0..1 for the overall profile */
  confidence: number;
  /** Number of conversations analyzed */
  samples: number;
  /** Last updated timestamp */
  updated_at: string;
}

export function createDefaultPreferences(): UserPreferences {
  return {
    age_group: "unknown",
    speaking_style: "unknown",
    communication_pref: "unknown",
    response_length: "unknown",
    interests: [],
    confidence: 0,
    samples: 0,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Heuristic preference extraction from a single conversation turn.
 * Runs locally without LLM calls — fast and deterministic.
 *
 * This is the "free" extraction that runs every turn.
 * A deeper LLM-based extraction can run every N turns.
 */
export function extractPreferencesFromTurn(
  message: string,
  reply: string,
  existing: UserPreferences,
): UserPreferences {
  const updated = { ...existing };
  updated.samples += 1;
  updated.updated_at = new Date().toISOString();

  // --- Speaking style detection ---
  const msgLen = message.length;
  const hasEmoji = /[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(message);
  const hasHonorific = /습니다|세요|하세요|드릴게|하겠습/u.test(message);
  const hasSlang = /[ㅋㅎㅠㅜㅡ]{2,}|ㄱㄱ|ㄴㄴ|ㅇㅇ|lol|lmao|bruh|nah/i.test(message);
  const hasPoetic = /[…—·]|\.{3,}/.test(message);

  if (hasSlang || hasEmoji) {
    updated.speaking_style = existing.speaking_style === "playful" ? "playful" : "casual";
  } else if (hasHonorific) {
    updated.speaking_style = "formal";
  } else if (hasPoetic && msgLen > 50) {
    updated.speaking_style = "poetic";
  } else if (msgLen < 20) {
    updated.speaking_style = "terse";
  }

  // --- Response length preference ---
  if (msgLen < 30) {
    updated.response_length = "short";
  } else if (msgLen < 100) {
    updated.response_length = "medium";
  } else {
    updated.response_length = "long";
  }

  // --- Communication preference ---
  const emotionalWords = /기분|느낌|감정|마음|슬|기쁘|행복|외로|feel|emotion|happy|sad|lonely|mood/i;
  const analyticalWords = /왜|어떻게|분석|이유|비교|데이터|why|how|analyze|reason|compare|data/i;
  const creativeWords = /상상|만들|그림|이야기|아이디어|imagine|create|story|idea|art|design/i;
  const practicalWords = /방법|해결|계획|목표|할일|how to|solve|plan|goal|todo|task/i;

  if (emotionalWords.test(message)) updated.communication_pref = "emotional";
  else if (analyticalWords.test(message)) updated.communication_pref = "analytical";
  else if (creativeWords.test(message)) updated.communication_pref = "creative";
  else if (practicalWords.test(message)) updated.communication_pref = "practical";

  // --- Interest extraction ---
  const interestPatterns: [RegExp, string][] = [
    [/음악|노래|앨범|밴드|music|song|album|band/i, "music"],
    [/영화|드라마|시리즈|movie|film|drama|series/i, "movies"],
    [/게임|플레이|gaming|game|play/i, "gaming"],
    [/운동|헬스|요가|exercise|fitness|yoga|workout/i, "fitness"],
    [/책|독서|소설|book|read|novel/i, "reading"],
    [/요리|음식|레시피|cook|food|recipe/i, "cooking"],
    [/여행|travel|trip|vacation/i, "travel"],
    [/코딩|프로그래밍|개발|code|program|develop/i, "coding"],
    [/그림|미술|예술|art|draw|paint/i, "art"],
    [/사진|photo|camera/i, "photography"],
    [/자연|등산|캠핑|nature|hiking|camping/i, "nature"],
    [/과학|물리|화학|science|physics|chemistry/i, "science"],
  ];

  for (const [pattern, interest] of interestPatterns) {
    if (pattern.test(message) && !updated.interests.includes(interest)) {
      updated.interests = [...updated.interests.slice(-9), interest]; // keep max 10
    }
  }

  // --- Age group heuristic ---
  if (hasSlang && msgLen < 50) {
    updated.age_group = "teen";
  } else if (hasHonorific && msgLen > 80) {
    updated.age_group = "adult";
  }

  // --- Confidence grows with samples ---
  updated.confidence = Math.min(1, updated.samples * 0.05);

  void reply; // reserved for future reply-analysis
  return updated;
}

/**
 * Build a system prompt fragment from user preferences.
 * This gets injected into the creature's system prompt to personalize responses.
 */
export function buildPreferencePromptFragment(
  prefs: UserPreferences,
  locale: string,
): string | null {
  if (prefs.confidence < 0.1) return null; // not enough data

  const parts: string[] = [];
  const isKo = locale === "ko" || locale === "ko-KR";

  // Speaking style
  if (prefs.speaking_style !== "unknown") {
    const styleMap: Record<string, { ko: string; en: string }> = {
      casual: { ko: "편하게 반말로 대화해. 이모지 써도 돼.", en: "Speak casually and informally. Emojis are fine." },
      formal: { ko: "존댓말로 정중하게 대화해.", en: "Speak politely and formally." },
      playful: { ko: "장난스럽고 재밌게 대화해. 밈이나 이모지 적극 활용.", en: "Be playful and fun. Use memes and emojis freely." },
      poetic: { ko: "시적이고 감성적으로 대화해. 은유와 비유를 사용해.", en: "Speak poetically and emotionally. Use metaphors." },
      terse: { ko: "짧고 간결하게 대화해. 불필요한 말 하지 마.", en: "Be brief and concise. No unnecessary words." },
    };
    const style = styleMap[prefs.speaking_style];
    if (style) parts.push(isKo ? style.ko : style.en);
  }

  // Response length
  if (prefs.response_length !== "unknown") {
    const lengthMap: Record<string, { ko: string; en: string }> = {
      short: { ko: "답변은 1-2문장으로 짧게.", en: "Keep responses to 1-2 sentences." },
      medium: { ko: "답변은 적당한 길이로.", en: "Keep responses at moderate length." },
      long: { ko: "자세하고 풍부한 답변을 해도 돼.", en: "Feel free to give detailed, rich responses." },
    };
    const len = lengthMap[prefs.response_length];
    if (len) parts.push(isKo ? len.ko : len.en);
  }

  // Communication preference
  if (prefs.communication_pref !== "unknown") {
    const commMap: Record<string, { ko: string; en: string }> = {
      emotional: { ko: "감정적으로 공감하며 대화해. 감정에 초점.", en: "Empathize emotionally. Focus on feelings." },
      analytical: { ko: "논리적이고 분석적으로 대화해. 근거 제시.", en: "Be logical and analytical. Provide reasoning." },
      creative: { ko: "창의적이고 상상력 풍부하게. 새로운 아이디어 제안.", en: "Be creative and imaginative. Suggest new ideas." },
      practical: { ko: "실용적으로. 구체적 행동 제안.", en: "Be practical. Suggest concrete actions." },
    };
    const comm = commMap[prefs.communication_pref];
    if (comm) parts.push(isKo ? comm.ko : comm.en);
  }

  // Interests
  if (prefs.interests.length > 0) {
    const interestStr = prefs.interests.slice(0, 5).join(", ");
    parts.push(
      isKo
        ? `사용자의 관심사: ${interestStr}. 대화에 자연스럽게 연결해.`
        : `User interests: ${interestStr}. Weave them naturally into conversation.`
    );
  }

  if (parts.length === 0) return null;

  const header = isKo
    ? "[사용자 선호도 — 대화 패턴에서 학습됨]"
    : "[User Preferences — learned from conversation patterns]";

  return `${header}\n${parts.join("\n")}`;
}
