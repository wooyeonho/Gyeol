export type UsageMode =
  | "playful"
  | "intimate"
  | "strategic"
  | "primal"
  | "surreal"
  | "reflective"
  | "creative";

export type UsageProfile = {
  scores: Record<UsageMode, number>;
  primary_mode: UsageMode;
  updated_at: string;
};

const MODES: UsageMode[] = [
  "playful",
  "intimate",
  "strategic",
  "primal",
  "surreal",
  "reflective",
  "creative",
];

const KEYWORDS: Record<UsageMode, string[]> = {
  playful: ["ㅋㅋ", "ㅎㅎ", "joke", "fun", "cute", "귀엽", "장난", "놀자", "lol", "meme", "pet", "칭찬"],
  intimate: ["love", "kiss", "romance", "hug", "섹시", "사랑", "설레", "애인", "남친", "여친", "매혹", "intimate"],
  strategic: ["plan", "task", "priority", "project", "launch", "ship", "roadmap", "strategy", "debug", "fix", "정리", "계획", "우선순위", "문제"],
  primal: ["dinosaur", "dragon", "beast", "hunt", "war", "fight", "predator", "공룡", "드래곤", "야수", "사냥", "본능", "전투"],
  surreal: ["void", "cosmic", "unknown", "impossible", "eldritch", "abstract", "공허", "초월", "존재하지", "기이", "기묘", "무언가"],
  reflective: ["feel", "why", "memory", "future", "self", "meaning", "emotion", "기분", "감정", "왜", "의미", "기억", "나 자신"],
  creative: ["draw", "story", "poem", "music", "design", "character", "art", "create", "소설", "시", "음악", "디자인", "캐릭터", "창작"],
};

function getDefaultScores(): Record<UsageMode, number> {
  return {
    playful: 0,
    intimate: 0,
    strategic: 0,
    primal: 0,
    surreal: 0,
    reflective: 0,
    creative: 0,
  };
}

export function getDefaultUsageProfile(): UsageProfile {
  return {
    scores: getDefaultScores(),
    primary_mode: "reflective",
    updated_at: new Date().toISOString(),
  };
}

function normalizeProfile(input: unknown): UsageProfile {
  const raw = (input ?? {}) as Partial<UsageProfile> & {
    scores?: Partial<Record<UsageMode, number>>;
  };
  const scores = getDefaultScores();
  for (const mode of MODES) {
    scores[mode] = Number(raw.scores?.[mode] ?? 0);
  }
  const primaryMode = MODES.includes(raw.primary_mode as UsageMode)
    ? (raw.primary_mode as UsageMode)
    : "reflective";
  return {
    scores,
    primary_mode: primaryMode,
    updated_at: typeof raw.updated_at === "string" ? raw.updated_at : new Date().toISOString(),
  };
}

function countHits(text: string, keywords: string[]) {
  let hits = 0;
  for (const keyword of keywords) {
    if (text.includes(keyword)) hits += 1;
  }
  return hits;
}

function applyMessageHeuristics(text: string, scores: Record<UsageMode, number>) {
  for (const mode of MODES) {
    const hits = countHits(text, KEYWORDS[mode]);
    if (hits > 0) scores[mode] += hits * 1.4;
  }

  if (text.includes("?")) scores.reflective += 0.4;
  if (text.length > 140) scores.reflective += 0.6;
  if (/\d/.test(text)) scores.strategic += 0.4;
  if (text.includes("!")) scores.playful += 0.2;
}

export function detectPrimaryUsageModeFromText(text: string): UsageMode {
  const scores = getDefaultScores();
  applyMessageHeuristics(text.toLowerCase(), scores);
  let primaryMode: UsageMode = "reflective";
  let bestScore = -Infinity;
  for (const mode of MODES) {
    if (scores[mode] > bestScore) {
      bestScore = scores[mode];
      primaryMode = mode;
    }
  }
  return primaryMode;
}

export function updateUsageProfile(
  previous: unknown,
  userMessage: string,
  assistantReply: string
): UsageProfile {
  const prev = normalizeProfile(previous);
  const scores = getDefaultScores();
  for (const mode of MODES) {
    scores[mode] = prev.scores[mode] * 0.96;
  }

  const combined = `${userMessage} ${assistantReply}`.toLowerCase();
  applyMessageHeuristics(combined, scores);

  let primaryMode: UsageMode = prev.primary_mode;
  let bestScore = -Infinity;
  for (const mode of MODES) {
    if (scores[mode] > bestScore) {
      bestScore = scores[mode];
      primaryMode = mode;
    }
  }

  return {
    scores,
    primary_mode: primaryMode,
    updated_at: new Date().toISOString(),
  };
}

export function getUsageModeLabel(mode: UsageMode, rawLocale: string) {
  const locale: "ko" | "en" = rawLocale === "ko" ? "ko" : "en";
  const labels: Record<UsageMode, { ko: string; en: string }> = {
    playful: { ko: "장난형", en: "playful" },
    intimate: { ko: "친밀형", en: "intimate" },
    strategic: { ko: "전략형", en: "strategic" },
    primal: { ko: "본능형", en: "primal" },
    surreal: { ko: "신비형", en: "surreal" },
    reflective: { ko: "성찰형", en: "reflective" },
    creative: { ko: "창작형", en: "creative" },
  };
  return labels[mode][locale];
}

export function getUsageModeNarrative(mode: UsageMode, rawLocale: string) {
  const locale: "ko" | "en" = rawLocale === "ko" ? "ko" : "en";
  const messages: Record<UsageMode, { ko: string; en: string }> = {
    playful: {
      ko: "장난과 애착이 많은 사용이 형상을 더 귀엽고 생명체답게 밀어주고 있습니다.",
      en: "Playful and affectionate use is pushing the form toward something softer and more creature-like.",
    },
    intimate: {
      ko: "가까운 관계와 강한 끌림이 사람다운 느낌을 키우고 있습니다.",
      en: "Intimate and magnetic interactions are giving the being a stronger humanoid presence.",
    },
    strategic: {
      ko: "계획과 문제 해결 중심으로 써서 또렷하고 단단한 느낌이 생기고 있습니다.",
      en: "Planning and problem-solving use is shaping the being into a more precise, guardian-like presence.",
    },
    primal: {
      ko: "강함과 본능, 전투적인 상상력이 거칠고 야생적인 모습을 키우고 있습니다.",
      en: "Power, instinct, and feral imagination are pushing the form toward something more reptilian and wild.",
    },
    surreal: {
      ko: "신비로운 상상이 분류할 수 없는 낯선 모습을 만들고 있습니다.",
      en: "Surreal and transcendent imagination is opening the form into something impossible to classify.",
    },
    reflective: {
      ko: "깊은 질문과 돌아보기가 모습을 더 생각이 깊고 꿈같은 존재로 바꾸고 있습니다.",
      en: "Deep questions and reflection are turning the form into something more lucid and contemplative.",
    },
    creative: {
      ko: "창작과 상상이 모습을 더 자유롭고 낯선 방향으로 이끌고 있습니다.",
      en: "Creation and imagination are making the form stranger, freer, and less bound by category.",
    },
  };
  return messages[mode][locale];
}
