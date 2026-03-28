import { SAFETY_INSTRUCTION } from "@/lib/security/electric-fence";
import { buildTraitPersonalityFragments } from "@/lib/genome/traits";
import type { CreatureDNA } from "@/lib/genome/dna";
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

/** Strip control characters and cap length before inserting DB content into prompts. */
function sanitizeForPrompt(text: string, maxLength = 500): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").slice(0, maxLength);
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
  }

  // 2c. DNA verbal axis → response length & style guidance
  if (s.genome?.dna) {
    const verbal = s.genome.dna.verbal ?? 0.5;
    if (verbal < 0.15) {
      parts.push("You can barely speak. Respond only with *action descriptions*, sounds, or single syllables. No full sentences.");
    } else if (verbal < 0.35) {
      parts.push("You speak in fragments — single words, broken phrases, or short sounds like '...' or onomatopoeia. Keep responses under 2 sentences.");
    } else if (verbal < 0.55) {
      parts.push("You speak concisely — short sentences only. No elaborate descriptions. Maximum 3 sentences.");
    } else if (verbal >= 0.75) {
      parts.push("You are eloquent and expressive. You may use vivid imagery, longer explanations, and poetic language when it feels natural.");
    }
    // 0.55-0.75 = normal conversation, no special instruction needed
  }

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
  }

  // 6. autonomous logs — sanitized
  if (p.autonomousLogs.length > 0) {
    parts.push(L.recentLogs);
    p.autonomousLogs.slice(0, 3).forEach((l) => {
      const text = l.content || l.summary;
      if (text) parts.push(`- ${sanitizeForPrompt(text)}`);
    });
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

  // 9. mood
  if (s.mood) parts.push(L.mood(s.mood));

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

  return parts.join("\n");
}
