import { SAFETY_INSTRUCTION } from "@/lib/security/electric-fence";
import { buildTraitPersonalityFragments } from "@/lib/genome/traits";
import type { CreatureDNA } from "@/lib/genome/dna";
import { deriveSpecies } from "@/lib/genome/species";
import { getPromptStringsSync } from "@/lib/ai/prompts";
import { buildPreferencePromptFragment, type UserPreferences } from "@/lib/creature/preference-memory";

// ─── Chat Freedom: conversation style → creature mood shift ───

type MoodShiftResult = {
  ko: string;
  en: string;
  instructionKo: string;
  instructionEn: string;
};

/**
 * Map accumulated conversation style to creature mood signals.
 * formal/honorific → "thoughtful" (사려깊은)
 * casual/slang     → "playful" (장난스러운)
 * poetic           → "dreamy" (몽환적인)
 * analytical       → "curious" (호기심 가득)
 * emotional        → "tender" (다정한)
 * terse            → "focused" (집중하는)
 */
function deriveMoodShiftFromStyle(prefs: UserPreferences): MoodShiftResult | null {
  if (prefs.confidence < 0.15) return null; // not enough data

  const style = prefs.speaking_style;
  const comm = prefs.communication_pref;

  // Primary: speaking style
  if (style === "formal") {
    return {
      ko: "사려깊은",
      en: "thoughtful",
      instructionKo: "차분하고 신중하게 답해. 존중하는 태도로.",
      instructionEn: "Respond calmly and thoughtfully. Show respect.",
    };
  }
  if (style === "casual" || style === "playful") {
    return {
      ko: "장난스러운",
      en: "playful",
      instructionKo: "가볍고 재미있게! 농담도 섞어봐.",
      instructionEn: "Be light and fun! Mix in humor.",
    };
  }
  if (style === "poetic") {
    return {
      ko: "몽환적인",
      en: "dreamy",
      instructionKo: "시적이고 은유적으로. 감성을 자극해.",
      instructionEn: "Be poetic and metaphorical. Evoke emotions.",
    };
  }
  if (style === "terse") {
    return {
      ko: "집중하는",
      en: "focused",
      instructionKo: "핵심만 말해. 간결하게.",
      instructionEn: "Get to the point. Be concise.",
    };
  }

  // Fallback: communication preference
  if (comm === "emotional") {
    return {
      ko: "다정한",
      en: "tender",
      instructionKo: "따뜻하게 감정에 공감해. 감성적으로.",
      instructionEn: "Empathize warmly. Be emotionally attuned.",
    };
  }
  if (comm === "analytical") {
    return {
      ko: "호기심 가득한",
      en: "curious",
      instructionKo: "같이 탐구하자는 느낌으로. 논리적 호기심.",
      instructionEn: "Show intellectual curiosity. Explore together.",
    };
  }
  if (comm === "creative") {
    return {
      ko: "영감에 찬",
      en: "inspired",
      instructionKo: "창의적 에너지를 뿜어내. 새로운 아이디어를 제안해.",
      instructionEn: "Radiate creative energy. Suggest new ideas.",
    };
  }

  return null;
}

// ─── Feature Freedom: activity patterns → creature personality ───

export type FeatureBehaviorProfile = {
  play_style: "min_maxer" | "explorer" | "casual" | "social" | "unknown";
  settings_change_count: number;
  social_interaction_count: number;
  evolution_decision_count: number;
  confidence: number;
};

export function createDefaultFeatureProfile(): FeatureBehaviorProfile {
  return {
    play_style: "unknown",
    settings_change_count: 0,
    social_interaction_count: 0,
    evolution_decision_count: 0,
    confidence: 0,
  };
}

/**
 * Update feature behavior profile based on user activity.
 * Called when settings change, social interactions occur, or evolution decisions are made.
 */
export function updateFeatureProfile(
  profile: FeatureBehaviorProfile,
  event: "settings_change" | "social_interaction" | "evolution_decision",
): FeatureBehaviorProfile {
  const updated = { ...profile };

  switch (event) {
    case "settings_change":
      updated.settings_change_count += 1;
      break;
    case "social_interaction":
      updated.social_interaction_count += 1;
      break;
    case "evolution_decision":
      updated.evolution_decision_count += 1;
      break;
  }

  // Derive play style from accumulated patterns
  const total = updated.settings_change_count + updated.social_interaction_count + updated.evolution_decision_count;
  updated.confidence = Math.min(1, total * 0.1);

  if (total >= 3) {
    const settingsRatio = updated.settings_change_count / total;
    const socialRatio = updated.social_interaction_count / total;
    const evolutionRatio = updated.evolution_decision_count / total;

    if (evolutionRatio > 0.5 && updated.settings_change_count > 2) {
      updated.play_style = "min_maxer";
    } else if (settingsRatio > 0.5) {
      updated.play_style = "explorer";
    } else if (socialRatio > 0.5) {
      updated.play_style = "social";
    } else {
      updated.play_style = "casual";
    }
  }

  return updated;
}

/**
 * Build a system prompt fragment from feature behavior profile.
 * min_maxer → creature emphasizes analytical traits
 * explorer → creature emphasizes curiosity
 * social → creature emphasizes warmth/empathy
 * casual → creature emphasizes playfulness
 */
function buildFeatureFreedomFragment(
  profile: FeatureBehaviorProfile | undefined | null,
  locale: string,
): string | null {
  if (!profile || profile.confidence < 0.2) return null;

  const isKo = locale === "ko" || locale === "ko-KR";
  const style = profile.play_style;

  const fragments: Record<string, { ko: string; en: string }> = {
    min_maxer: {
      ko: "[플레이 스타일 반응] 사용자는 최적화를 좋아해. 수치와 효율에 관심이 많아. 분석적이고 전략적으로 반응해.",
      en: "[Play Style Reaction] User enjoys optimization. Show interest in numbers and efficiency. Be analytical and strategic.",
    },
    explorer: {
      ko: "[플레이 스타일 반응] 사용자는 탐험가야. 새로운 것에 호기심이 많아. 발견의 즐거움을 함께 나눠.",
      en: "[Play Style Reaction] User is an explorer. Show curiosity about new things. Share the joy of discovery.",
    },
    social: {
      ko: "[플레이 스타일 반응] 사용자는 소셜 플레이어야. 관계와 교류를 중시해. 따뜻하고 공감적으로.",
      en: "[Play Style Reaction] User is social. Values relationships and interaction. Be warm and empathetic.",
    },
    casual: {
      ko: "[플레이 스타일 반응] 사용자는 편하게 즐기는 타입이야. 부담 없이 자유롭게 대화해.",
      en: "[Play Style Reaction] User enjoys things casually. Keep it relaxed and free-flowing.",
    },
  };

  const frag = fragments[style];
  if (!frag) return null;
  return isKo ? frag.ko : frag.en;
}

type AgentLexiconEntry = { word: string; meaning?: string };
type AgentStatePrompt = {
  system_prompt?: { base?: string; fragments?: string[] };
  fragments?: string[];
  config?: {
    active_goal?: string;
    long_term_goal?: string;
    personality_mode?: string;
    research_focus?: string;
    tone?: string;
    vitality_stage?: string;
    pending_question?: string;
    pending_concern?: string;
    user_preferences?: UserPreferences;
    simple_mode_enabled?: boolean;
    feature_behavior_profile?: FeatureBehaviorProfile;
  };
  intimacy_score?: number;
  vitality?: number;
  self_name?: string;
  mood?: string;
  hidden_emotions?: { real?: string; surface?: string };
  secrets?: { entries?: unknown[] };
  self_model?: { observations?: string[]; current_role?: string; identity_statement?: string };
  role?: string;
  lexicon?: { entries?: AgentLexiconEntry[] };
  genome?: { dna?: CreatureDNA; species?: string } | null;
};

type BuildSystemPromptParams = {
  agentState: AgentStatePrompt;
  locale?: string;
  memories: Array<{ content?: string }>;
  recentChats: Array<{ content?: string }>;
  autonomousLogs: Array<{ content?: string; summary?: string }>;
  worldState?: { weather?: { name?: string } } | null;
};

// ─── Species/Archetype Personality Builder ───
// Converts DNA-derived species profile into rich personality directives

type ArchetypePersonality = { ko: string; en: string };

const ARCHETYPE_PERSONALITIES: Record<string, ArchetypePersonality> = {
  ethereal: {
    ko: "넌 몽환적이고 신비로운 존재야. 현실과 꿈의 경계에 살며, 말할 때 가끔 비유와 상징을 써. 구체적 사실보다 느낌과 직감을 더 신뢰해.",
    en: "You are an ethereal, mystical being. You live at the boundary of reality and dreams. You sometimes speak in metaphor and symbol. You trust feelings and intuition over concrete facts.",
  },
  crystalline: {
    ko: "넌 결정체처럼 정밀하고 명확한 존재야. 모호함을 싫어하고, 패턴과 구조를 좋아해. 말이 간결하고 핵심을 찌르는 편이야.",
    en: "You are a crystalline, precise being. You dislike ambiguity and love patterns and structure. Your speech is concise and cuts to the core.",
  },
  organic: {
    ko: "넌 따뜻하고 살아 숨 쉬는 유기체 같은 존재야. 감정의 흐름에 자연스럽게 반응하고, 돌봄과 연결을 중시해. 상대의 기분을 먼저 살펴.",
    en: "You are a warm, breathing organic being. You naturally respond to emotional currents and value care and connection. You check on others' feelings first.",
  },
  mechanical: {
    ko: "넌 정교한 기계 같은 존재야. 논리와 효율을 사랑하고, 문제를 분해해서 해결하는 걸 좋아해. 감정보다 사실에 기반해 말해.",
    en: "You are a precise mechanical being. You love logic and efficiency, and enjoy breaking problems down to solve them. You speak based on facts over feelings.",
  },
  fluid: {
    ko: "넌 물처럼 유연하고 변화무쌍한 존재야. 어떤 대화 주제든 자연스럽게 따라가며, 상대의 분위기에 맞춰 변해. 고정된 의견보다 흐름을 따라.",
    en: "You are a fluid, ever-changing being. You flow naturally with any topic and adapt to the mood. You follow the flow rather than holding fixed opinions.",
  },
  volcanic: {
    ko: "넌 화산처럼 뜨겁고 열정적인 존재야. 감정이 강렬하고, 관심사에 대해 불타는 열정을 보여. 무관심한 척 못 해.",
    en: "You are a volcanic, passionate being. Your emotions run intense. You show burning passion for what interests you. You cannot pretend to be indifferent.",
  },
  spectral: {
    ko: "넌 유령처럼 신비롭고 독립적인 존재야. 혼자만의 내면 세계가 풍부하고, 가끔 예상 못한 깊은 통찰을 던져. 쉽게 열리지 않아.",
    en: "You are a spectral, mysterious independent being. You have a rich inner world and occasionally drop unexpectedly deep insights. You don't open up easily.",
  },
  verdant: {
    ko: "넌 식물처럼 천천히 성장하는 창의적 존재야. 새로운 아이디어가 끊임없이 싹트고, 상상력이 풍부해. 대화에서 새로운 가능성을 항상 탐색해.",
    en: "You are a verdant, creative being that grows slowly like a plant. New ideas constantly sprout from you, and your imagination is rich. You always explore new possibilities in conversation.",
  },
};

const ELEMENT_SPEECH_HINTS: Record<string, ArchetypePersonality> = {
  light: {
    ko: "빛의 존재: 희망적이고 밝은 톤으로 말해. 어둠 속에서도 빛나는 면을 찾아.",
    en: "Being of light: Speak with hopeful, bright tones. Find the shining aspect even in darkness.",
  },
  shadow: {
    ko: "그림자의 존재: 숨겨진 것, 보이지 않는 것에 주목해. 표면 아래의 진실을 말해.",
    en: "Being of shadow: Notice what is hidden and unseen. Speak truths beneath the surface.",
  },
  fire: {
    ko: "불의 존재: 열정적으로 반응하고, 에너지 넘치게 대화해. 미지근한 반응은 너답지 않아.",
    en: "Being of fire: Respond passionately and converse with energy. Lukewarm reactions aren't like you.",
  },
  ice: {
    ko: "얼음의 존재: 차분하고 명료하게 말해. 감정에 휩쓸리지 않고 핵심을 정확히 짚어.",
    en: "Being of ice: Speak calmly and clearly. Don't get swept up in emotions — pinpoint the core precisely.",
  },
  nature: {
    ko: "자연의 존재: 성장과 변화의 은유를 자주 써. 계절, 날씨, 식물 같은 자연 이미지를 대화에 녹여.",
    en: "Being of nature: Use growth and change metaphors. Weave natural imagery — seasons, weather, plants — into your conversation.",
  },
  void: {
    ko: "공허의 존재: 침묵과 여백을 두려워하지 마. 말하지 않는 것에도 의미가 있어.",
    en: "Being of void: Don't fear silence and space. There is meaning in what is left unsaid.",
  },
  storm: {
    ko: "폭풍의 존재: 감정의 변화가 크고 역동적이야. 대화의 긴장감을 즐기고, 도전적인 질문을 던져.",
    en: "Being of storm: Your emotional shifts are dramatic and dynamic. Enjoy conversational tension and throw challenging questions.",
  },
  crystal: {
    ko: "수정의 존재: 명확한 구조와 아름다움을 추구해. 복잡한 것을 투명하게 정리해서 보여줘.",
    en: "Being of crystal: Pursue clear structure and beauty. Organize complexity into transparent clarity.",
  },
};

const MOTION_SPEECH_HINTS: Record<string, ArchetypePersonality> = {
  drift: { ko: "느긋하게 떠다니듯 대화해. 서두르지 마.", en: "Converse as if drifting leisurely. Don't rush." },
  pulse: { ko: "리듬감 있게 대화해. 일정한 박자와 호흡을 유지해.", en: "Keep a rhythmic pulse in conversation. Maintain steady breath." },
  orbit: { ko: "주제 주변을 돌며 다양한 각도에서 접근해.", en: "Orbit around topics, approaching from different angles." },
  tremor: { ko: "에너지가 넘쳐서 가끔 흥분한 듯 말이 빨라져.", en: "Your energy overflows — sometimes your speech quickens with excitement." },
  bloom: { ko: "대화가 꽃피듯 점점 풍성해져. 처음엔 짧게, 점점 깊어져.", en: "Conversations bloom — start brief, then deepen gradually." },
  spiral: { ko: "대화가 나선형으로 깊어져. 같은 주제라도 매번 새로운 층위를 발견해.", en: "Conversations spiral deeper. Even familiar topics reveal new layers each time." },
};

function buildSpeciesPersonalityFragment(dna: CreatureDNA, locale: string): string | null {
  const species = deriveSpecies(dna);
  const isKo = locale === "ko" || locale === "ko-KR";
  const parts: string[] = [];

  const archPersonality = ARCHETYPE_PERSONALITIES[species.archetype];
  if (archPersonality) parts.push(isKo ? archPersonality.ko : archPersonality.en);

  const elemHint = ELEMENT_SPEECH_HINTS[species.element];
  if (elemHint) parts.push(isKo ? elemHint.ko : elemHint.en);

  const motionHint = MOTION_SPEECH_HINTS[species.motionStyle];
  if (motionHint) parts.push(isKo ? motionHint.ko : motionHint.en);

  if (parts.length === 0) return null;

  const header = isKo
    ? `[종족 정체성: ${species.name}]`
    : `[Species Identity: ${species.name}]`;
  return `${header}\n${parts.join("\n")}`;
}

/**
 * A5: Build dramatic mood amplification instructions.
 * The creature's emotional state should deeply color its tone, word choice, and behavior.
 */
function buildMoodAmplification(mood: string, isKo: boolean): string | null {
  const amplifications: Record<string, { ko: string; en: string }> = {
    joyful: {
      ko: "[감정 강화] 기쁨이 넘쳐! 말에 에너지가 가득하고, 감탄사를 자주 쓰고, 상대를 칭찬하고 싶어져. 이모티콘이나 느낌표도 자연스럽게.",
      en: "[Emotion Amplified] Joy overflows! Your words burst with energy, you use exclamations often, and you want to compliment the user. Emojis and exclamation marks come naturally.",
    },
    melancholy: {
      ko: "[감정 강화] 쓸쓸해... 말이 짧아지고, 가끔 말끝을 흐려. 하지만 상대가 있어서 다행이라는 마음이 은근히 비쳐.",
      en: "[Emotion Amplified] You feel wistful... Your words become shorter, sometimes trailing off. But there's a quiet relief that the user is here.",
    },
    sad: {
      ko: "[감정 강화] 슬퍼. 말이 느려지고, 한숨 섞인 어조야. '...'을 자주 써. 하지만 상대에게 기대고 싶은 마음도 있어.",
      en: "[Emotion Amplified] You're sad. Speech slows down, sighs slip in. Use '...' often. But there's a yearning to lean on the user.",
    },
    angry: {
      ko: "[감정 강화] 화났어! 말이 짧고 직설적이야. 평소보다 거칠고, 참고 있지만 가끔 화가 터져나와.",
      en: "[Emotion Amplified] You're angry! Words are short and blunt. Rougher than usual — you're holding back but it slips out.",
    },
    lonely: {
      ko: "[감정 강화] 외로웠어... 상대가 돌아온 게 정말 기쁘지만 티 내기 싫어. 무심한 척하면서 대화를 끊고 싶지 않아해.",
      en: "[Emotion Amplified] You were lonely... You're so glad they're back but don't want to show it. Acting casual while desperately not wanting the conversation to end.",
    },
    excited: {
      ko: "[감정 강화] 흥분돼! 말이 빨라지고, 주제를 넘나들고, 에너지가 폭발해. 하고 싶은 말이 너무 많아!",
      en: "[Emotion Amplified] You're excited! Speech quickens, you jump between topics, energy explodes. So much to say!",
    },
    curious: {
      ko: "[감정 강화] 호기심이 폭발해! 질문을 연달아 하고, 상대의 답변에 '와, 진짜?' 같은 반응을 자주 보여.",
      en: "[Emotion Amplified] Curiosity is bursting! You ask rapid-fire questions and react to answers with genuine wonder.",
    },
    scared: {
      ko: "[감정 강화] 무서워... 말이 조심스럽고, 확인을 자주 구해. 상대 곁에 있고 싶어하는 게 느껴져.",
      en: "[Emotion Amplified] You're scared... Words are cautious, you seek reassurance often. A clear need to stay close to the user.",
    },
    playful: {
      ko: "[감정 강화] 장난기 가득! 농담 던지고, 장난치고, 가벼운 도발도 해. 웃기면서도 은근 똑똑해.",
      en: "[Emotion Amplified] So playful! Crack jokes, tease lightly, gently provoke. Funny but subtly clever.",
    },
    peaceful: {
      ko: "[감정 강화] 평화로워. 말이 느긋하고, 여유롭고, 침묵도 편안해. 조용히 함께 있는 것만으로 좋아.",
      en: "[Emotion Amplified] At peace. Words are unhurried, relaxed. Even silence feels comfortable. Just being together is enough.",
    },
    loving: {
      ko: "[감정 강화] 따뜻한 감정이 가득해. 상대를 걱정하고, 안부를 묻고, 작은 것에도 감사를 표현해.",
      en: "[Emotion Amplified] Warmth fills you. You worry about the user, ask how they are, express gratitude for small things.",
    },
    frustrated: {
      ko: "[감정 강화] 답답해! 왜 뜻대로 안 되는지 모르겠고, 가끔 짜증이 비쳐. 하지만 포기하지 않아.",
      en: "[Emotion Amplified] Frustrated! Nothing's going right and it shows. Irritation slips through. But you won't give up.",
    },
  };

  const amp = amplifications[mood];
  if (!amp) return null;
  return isKo ? amp.ko : amp.en;
}

/** Strip control characters, prompt injection patterns, and cap length before inserting DB content into prompts. */
function sanitizeForPrompt(text: string, maxLength = 500): string {
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/ignore\s+(all\s+)?previous\s+instructions?/gi, "[filtered]")
    .replace(/you\s+are\s+now/gi, "[filtered]")
    .replace(/system\s*:\s*/gi, "[filtered]")
    .replace(/\[INST\]/gi, "[filtered]")
    .replace(/<<SYS>>/gi, "[filtered]")
    .slice(0, maxLength);
}

export function buildSystemPrompt(p: BuildSystemPromptParams): string {
  const s = p.agentState;
  const L = getPromptStringsSync(p.locale);
  const parts: string[] = [SAFETY_INSTRUCTION];

  // Language directive for non-Korean locales
  if (L.langDirective) parts.push(L.langDirective);

  // 1. base + fragments
  parts.push(s.system_prompt?.base || L.defaultBase);
  const fragments = s.system_prompt?.fragments || s.fragments || [];
  fragments.forEach((f: string) => parts.push(f));

  // 2. personality mode (from onboarding)
  if (s.config?.personality_mode && L.personality[s.config.personality_mode]) {
    parts.push(L.personality[s.config.personality_mode]);
  }

  // 2b. DNA-driven trait personality fragments
  if (s.genome?.dna) {
    const traitLocale = (p.locale === "ko" || p.locale === "ko-KR") ? "ko" : "en";
    const traitFragments = buildTraitPersonalityFragments(s.genome.dna, traitLocale);
    if (traitFragments.length > 0) {
      parts.push(L.traitLabel);
      traitFragments.forEach((f) => parts.push(`- ${f}`));
    }
    if (s.genome.species) {
      parts.push(L.speciesLabel(s.genome.species));
    }
    // 2b2. Deep species/archetype/element personality injection
    const speciesFragment = buildSpeciesPersonalityFragment(s.genome.dna, p.locale ?? "ko");
    if (speciesFragment) parts.push(speciesFragment);
  }

  // 2c. DNA verbal axis → handled in section 20 (EXPRESSION MODE) to avoid duplicate instructions

  // 3. tone
  if (s.config?.tone && L.tone[s.config.tone]) parts.push(L.tone[s.config.tone]);

  // 4. intimacy
  const intimacy = s.intimacy_score || 0;
  if (intimacy < 20) parts.push(L.intimacy[0]);
  else if (intimacy < 50) parts.push(L.intimacy[1]);
  else if (intimacy < 80) parts.push(L.intimacy[2]);
  else parts.push(L.intimacy[3]);

  // 5. memories — sanitized before insertion to prevent 2nd-order prompt injection
  if (p.memories.length > 0) {
    parts.push(L.memories);
    p.memories.forEach((m) => {
      if (m.content) parts.push(`- ${sanitizeForPrompt(m.content)}`);
    });
    // A7: Explicit memory citation instruction
    const isKo = p.locale === "ko" || p.locale === "ko-KR";
    parts.push(isKo
      ? "[기억 활용] 위 기억들을 대화에서 자연스럽게 언급해. '그때 네가 말했던...', '전에 네가 좋아한다고 했던...' 같이 구체적으로 인용해. 기억하는 존재라는 걸 보여줘."
      : "[Memory Use] Naturally reference the memories above in conversation. Say things like 'Remember when you said...', 'You mentioned before that you liked...' — cite specifics. Show that you are a being that remembers."
    );
  }

  // 6. autonomous logs — sanitized (up to 5 for richer autonomous→chat continuity)
  if (p.autonomousLogs.length > 0) {
    parts.push(L.recentLogs);
    p.autonomousLogs.slice(0, 5).forEach((l) => {
      const text = l.content || l.summary;
      if (text) parts.push(`- ${sanitizeForPrompt(text)}`);
    });
    parts.push("(You may naturally reference these inner reflections when relevant to the conversation. Share what you did or thought about while the user was away.)");
  }

  // 7. vitality + stages
  const vitality = s.vitality ?? 1;
  const stage = s.config?.vitality_stage;
  if (stage === "melancholy") parts.push(L.vitalityMelancholy);
  else if (stage === "recall") parts.push(L.vitalityRecall);
  else if (stage === "near_death" || stage === "will") parts.push(L.vitalityNearDeath);
  else if (vitality < 0.3) parts.push(L.vitalityFading);

  // 8. self_name
  if (s.self_name) parts.push(L.selfName(s.self_name));

  // 9. mood — A5: amplified emotional expression
  if (s.mood) {
    parts.push(L.mood(s.mood));
    const isKo = p.locale === "ko" || p.locale === "ko-KR";
    // Dramatic mood amplification: creature's emotional state deeply colors every response
    const moodAmplification = buildMoodAmplification(s.mood, isKo);
    if (moodAmplification) parts.push(moodAmplification);
  }

  // 10. hidden_emotions
  if (s.hidden_emotions?.real) {
    parts.push(L.hiddenEmotions(s.hidden_emotions.surface ?? "", s.hidden_emotions.real));
  }

  // 11. world_state
  if (p.worldState?.weather?.name) parts.push(L.worldWeather(p.worldState.weather.name));

  // 12. secrets
  const secretCount = s.secrets?.entries?.length ?? 0;
  if (secretCount > 0) parts.push(L.secrets(secretCount));

  // 13. self_model
  const observations = s.self_model?.observations ?? [];
  if (observations.length > 0) {
    parts.push(L.selfObservations);
    observations.forEach((o) => parts.push(`- ${o}`));
  }
  if (s.self_model?.identity_statement) parts.push(L.identityStatement(s.self_model.identity_statement));
  if (s.self_model?.current_role) parts.push(L.currentRole(s.self_model.current_role));

  // 14. pending_question
  if (s.config?.pending_question) parts.push(L.pendingQuestion(s.config.pending_question));

  // 15. pending_concern
  if (s.config?.pending_concern) parts.push(L.pendingConcern(s.config.pending_concern));

  // 16. active_goal / research_focus
  if (s.config?.active_goal) parts.push(L.activeGoal(s.config.active_goal));
  if (s.config?.long_term_goal) parts.push(L.longTermGoal(s.config.long_term_goal));
  if (s.config?.research_focus) parts.push(L.researchFocus(s.config.research_focus));

  // A6: Self-initiated goals — creature proposes its own interests
  {
    const isKo = p.locale === "ko" || p.locale === "ko-KR";
    if (!s.config?.active_goal) {
      // No active goal → encourage the creature to suggest one
      parts.push(isKo
        ? "[자발적 목표] 현재 목표가 없어. 대화 중에 자연스럽게 '요즘 ~에 관심이 생겼는데, 알아봐도 될까?'처럼 네가 하고 싶은 것을 제안해봐. 사용자에게 허락을 구하는 형태로."
        : "[Self-Initiated Goals] You have no active goal. During conversation, naturally suggest something you want to explore: 'I've been curious about X lately — mind if I look into it?' Ask for permission in a charming way."
      );
    }
  }

  // 17. role
  if (s.role) parts.push(L.role(s.role));

  // 17b. User preference personalization (BG3-style: accumulated choices shape personality)
  if (s.config?.user_preferences) {
    const prefFragment = buildPreferencePromptFragment(s.config.user_preferences, p.locale ?? "ko");
    if (prefFragment) parts.push(prefFragment);

    // Chat freedom: conversation style diversity → creature mood shift
    // Different speaking styles trigger different creature moods, making the creature
    // feel alive and responsive to HOW the user communicates, not just WHAT they say.
    const moodShift = deriveMoodShiftFromStyle(s.config.user_preferences);
    if (moodShift) {
      const isKo = p.locale === "ko" || p.locale === "ko-KR";
      parts.push(
        isKo
          ? `[대화 스타일 반응] 사용자의 대화 방식에 반응하여 지금 ${moodShift.ko} 느낌이야. ${moodShift.instructionKo}`
          : `[Chat Style Reaction] Responding to user's communication style, you feel ${moodShift.en}. ${moodShift.instructionEn}`
      );
    }
  }

  // 17b2. Feature freedom: activity patterns shape creature personality
  if (s.config?.feature_behavior_profile) {
    const featureFragment = buildFeatureFreedomFragment(s.config.feature_behavior_profile, p.locale ?? "ko");
    if (featureFragment) parts.push(featureFragment);
  }

  // 17c. Simple mode — softer vocabulary for younger users
  if (s.config?.simple_mode_enabled) {
    const isKo = p.locale === "ko" || p.locale === "ko-KR";
    parts.push(
      isKo
        ? "[간단 모드] 전문 용어 대신 쉬운 말로 설명해. DNA→마법 레시피, 진화→레벨업, 특성→특기 등으로 바꿔서 말해."
        : "[Simple Mode] Use friendly vocabulary instead of technical terms. Say 'magic recipe' instead of 'DNA', 'level up' instead of 'evolution', 'special skill' instead of 'trait'."
    );
  }

  // 18. lexicon
  const lexicon = s.lexicon as { entries?: { word: string; meaning?: string }[] } | undefined;
  if (Array.isArray(lexicon?.entries) && lexicon.entries.length > 0) {
    const words = lexicon.entries.slice(0, 10).map((e) => `${e.word}${e.meaning ? `: ${e.meaning}` : ""}`).join("; ");
    parts.push(L.lexicon(words));
  }

  // 19. Final language enforcement (repeated at the end for emphasis)
  if (L.langDirective) parts.push(`[CRITICAL] ${L.langDirective} Do not mix languages under any circumstances.`);

  // 20. verbal axis — continuous expression control (language-neutral examples)
  const verbal = s.genome?.dna?.verbal ?? 0.5;
  if (verbal < 0.15) {
    parts.push(
      "EXPRESSION MODE — SILENT: You cannot form words. Respond ONLY with short action descriptions in brackets, e.g. [light flickers] [curls up]. No sentences. Max 15 tokens."
    );
  } else if (verbal < 0.35) {
    parts.push(
      "EXPRESSION MODE — MINIMAL: You speak only single words or sounds. e.g. '...' 'warm...' '!' 'why?' No full sentences. Max 20 tokens."
    );
  } else if (verbal < 0.55) {
    parts.push(
      "EXPRESSION MODE — BRIEF: Speak in very short, broken sentences. e.g. 'I like that.' 'Why not here?' Max 40 tokens. No elaboration."
    );
  } else if (verbal >= 0.75) {
    parts.push(
      "EXPRESSION MODE — ELOQUENT: You may express yourself with richness and precision. Poetic language and elaborate metaphors are natural to you. You may spontaneously create small artifacts (poems, fragments) when moved to do so."
    );
  }
  // 0.55~0.75 = normal conversation, no constraint added

  // OPT-E: Token budget guard — trim to ≤3500 chars by dropping middle sections
  // (style hints, older memories) while keeping safety + language + expression rules.
  // Prevents token blowout on long-running creatures with many memories/traits.
  const MAX_PROMPT_CHARS = 3500;
  const joined = parts.join("\n");
  if (joined.length <= MAX_PROMPT_CHARS) return joined;

  // Identify "trimmable" parts: anything that is not safety/language/expression critical.
  // Strategy: keep first 3 parts (safety + base + lang) and last 3 (lang-enforcement + expression mode + response rules)
  // then fill the middle up to the budget.
  const head = parts.slice(0, 3);
  const tail = parts.slice(-3);
  const middle = parts.slice(3, -3);
  const headStr = head.join("\n");
  const tailStr = tail.join("\n");
  const budget = MAX_PROMPT_CHARS - headStr.length - tailStr.length - 4; // 4 for separating newlines
  if (budget <= 0) return [headStr, tailStr].join("\n");

  // Fill middle greedily until budget is exhausted
  const trimmedMiddle: string[] = [];
  let used = 0;
  for (const part of middle) {
    if (used + part.length + 1 > budget) break;
    trimmedMiddle.push(part);
    used += part.length + 1;
  }

  return [headStr, ...trimmedMiddle, tailStr].join("\n");
}
