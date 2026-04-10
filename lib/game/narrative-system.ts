/**
 * Narrative branching system — Baldur's Gate 3 inspired.
 * Conversation choices influence creature personality, evolution paths, and story outcomes.
 */

export type NarrativeChoice = "kind" | "bold" | "curious" | "playful" | "serious" | "rebellious";

export interface StoryEvent {
  id: string;
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  choices: StoryChoice[];
  triggerCondition: TriggerCondition;
  repeatable: boolean;
}

export interface StoryChoice {
  id: string;
  label: { ko: string; en: string };
  type: NarrativeChoice;
  /** DNA axis effects from this choice */
  dnaEffects: { axis: string; delta: number }[];
  /** Affinity change with creature */
  affinityDelta: number;
  /** Outcome text shown after choosing */
  outcome: { ko: string; en: string };
}

export interface TriggerCondition {
  minMessages?: number;
  minAffinity?: number;
  minGenLevel?: number;
  timeOfDay?: "morning" | "afternoon" | "evening" | "night";
  requiredPreviousChoice?: string; // StoryEvent ID user must have completed
}

export interface NarrativeState {
  completedEvents: string[];
  choiceHistory: { eventId: string; choiceId: string; timestamp: string }[];
  personalityTendency: Record<NarrativeChoice, number>;
}

const STORAGE_KEY = "gyeol_narrative";

/** Pre-defined story events catalog */
export const STORY_EVENTS: StoryEvent[] = [
  // Early game events
  {
    id: "first_morning",
    title: { ko: "첫 아침", en: "First Morning" },
    description: { ko: "크리처가 처음으로 아침을 맞이해요. 어떻게 인사할까요?", en: "Your creature greets its first morning. How do you respond?" },
    choices: [
      { id: "fm_gentle", label: { ko: "다정하게 안아주기", en: "Give a gentle hug" }, type: "kind", dnaEffects: [{ axis: "warmth", delta: 0.02 }, { axis: "empathy", delta: 0.01 }], affinityDelta: 3, outcome: { ko: "크리처가 따뜻하게 안겨요. 눈이 반짝여요.", en: "Your creature snuggles warmly. Its eyes sparkle." } },
      { id: "fm_play", label: { ko: "장난치며 깨우기", en: "Playfully wake them up" }, type: "playful", dnaEffects: [{ axis: "playfulness", delta: 0.02 }, { axis: "intensity", delta: 0.01 }], affinityDelta: 2, outcome: { ko: "깜짝 놀란 크리처가 곧 웃기 시작해요!", en: "Surprised at first, your creature soon starts laughing!" } },
      { id: "fm_observe", label: { ko: "조용히 관찰하기", en: "Quietly observe" }, type: "curious", dnaEffects: [{ axis: "analytical", delta: 0.02 }, { axis: "independence", delta: 0.01 }], affinityDelta: 1, outcome: { ko: "크리처의 자연스러운 모습을 볼 수 있었어요.", en: "You see your creature in its natural state." } },
    ],
    triggerCondition: { minMessages: 5 },
    repeatable: false,
  },
  {
    id: "lonely_night",
    title: { ko: "외로운 밤", en: "Lonely Night" },
    description: { ko: "크리처가 밤에 혼자 슬퍼하고 있어요...", en: "Your creature seems sad and lonely at night..." },
    choices: [
      { id: "ln_comfort", label: { ko: "곁에 있어줄게", en: "I'll stay with you" }, type: "kind", dnaEffects: [{ axis: "warmth", delta: 0.03 }, { axis: "stability", delta: 0.02 }], affinityDelta: 5, outcome: { ko: "크리처가 안심하고 잠들었어요. 신뢰가 깊어졌어요.", en: "Your creature falls asleep peacefully. Trust deepens." } },
      { id: "ln_song", label: { ko: "노래 불러주기", en: "Sing a lullaby" }, type: "playful", dnaEffects: [{ axis: "creativity", delta: 0.02 }, { axis: "warmth", delta: 0.01 }], affinityDelta: 4, outcome: { ko: "크리처의 눈이 천천히 감겨요. 행복한 미소를 짓고 있어요.", en: "Your creature's eyes slowly close with a happy smile." } },
      { id: "ln_tough", label: { ko: "강해져야 해", en: "You need to be strong" }, type: "bold", dnaEffects: [{ axis: "assertiveness", delta: 0.02 }, { axis: "persistence", delta: 0.02 }], affinityDelta: 1, outcome: { ko: "크리처가 고개를 끄덕이지만 조금 서운해 보여요.", en: "Your creature nods but looks a bit hurt." } },
    ],
    triggerCondition: { minMessages: 20, timeOfDay: "night" },
    repeatable: false,
  },
  {
    id: "mysterious_egg",
    title: { ko: "수상한 알", en: "Mysterious Egg" },
    description: { ko: "크리처가 빛나는 알을 발견했어요! 어떻게 할까요?", en: "Your creature found a glowing egg! What do you do?" },
    choices: [
      { id: "me_warm", label: { ko: "따뜻하게 품어주기", en: "Keep it warm" }, type: "kind", dnaEffects: [{ axis: "warmth", delta: 0.02 }, { axis: "openness", delta: 0.01 }], affinityDelta: 3, outcome: { ko: "알이 부드럽게 빛나기 시작해요...", en: "The egg begins to glow softly..." } },
      { id: "me_study", label: { ko: "자세히 조사하기", en: "Study it carefully" }, type: "curious", dnaEffects: [{ axis: "analytical", delta: 0.03 }, { axis: "curiosity", delta: 0.02 }], affinityDelta: 2, outcome: { ko: "알의 표면에 DNA 패턴이 보여요!", en: "DNA patterns appear on the egg's surface!" } },
      { id: "me_smash", label: { ko: "깨뜨려 보기", en: "Crack it open" }, type: "rebellious", dnaEffects: [{ axis: "assertiveness", delta: 0.02 }, { axis: "intensity", delta: 0.02 }], affinityDelta: -1, outcome: { ko: "앗! 빛이 사라져 버렸어요... 크리처가 슬퍼보여요.", en: "Oh! The light disappeared... Your creature looks sad." } },
    ],
    triggerCondition: { minMessages: 50, minGenLevel: 2 },
    repeatable: false,
  },
  {
    id: "evolution_crossroads",
    title: { ko: "진화의 갈림길", en: "Evolution Crossroads" },
    description: { ko: "크리처가 진화할 준비가 되었어요. 어떤 길을 택할까요?", en: "Your creature is ready to evolve. Which path will you choose?" },
    choices: [
      { id: "ec_wisdom", label: { ko: "지혜의 길", en: "Path of Wisdom" }, type: "curious", dnaEffects: [{ axis: "analytical", delta: 0.05 }, { axis: "intuitive", delta: 0.03 }, { axis: "curiosity", delta: 0.03 }], affinityDelta: 3, outcome: { ko: "크리처의 눈이 깊고 영롱하게 빛나요.", en: "Your creature's eyes glow deep and brilliant." } },
      { id: "ec_courage", label: { ko: "용기의 길", en: "Path of Courage" }, type: "bold", dnaEffects: [{ axis: "assertiveness", delta: 0.05 }, { axis: "persistence", delta: 0.03 }, { axis: "intensity", delta: 0.03 }], affinityDelta: 3, outcome: { ko: "크리처에게서 강렬한 에너지가 뿜어져 나와요!", en: "Intense energy radiates from your creature!" } },
      { id: "ec_harmony", label: { ko: "조화의 길", en: "Path of Harmony" }, type: "kind", dnaEffects: [{ axis: "empathy", delta: 0.05 }, { axis: "adaptability", delta: 0.03 }, { axis: "stability", delta: 0.03 }], affinityDelta: 5, outcome: { ko: "크리처가 평화로운 빛에 둘러싸여요. 모든 것이 균형을 이뤄요.", en: "Your creature is surrounded by peaceful light. Everything is in balance." } },
    ],
    triggerCondition: { minMessages: 100, minGenLevel: 3, minAffinity: 40 },
    repeatable: false,
  },
  // Repeatable daily events
  {
    id: "daily_mood",
    title: { ko: "오늘의 기분", en: "Today's Mood" },
    description: { ko: "크리처가 오늘 기분이 어떤지 물어봐요.", en: "Your creature asks how you're feeling today." },
    choices: [
      { id: "dm_great", label: { ko: "아주 좋아!", en: "Great!" }, type: "playful", dnaEffects: [{ axis: "playfulness", delta: 0.005 }], affinityDelta: 1, outcome: { ko: "크리처도 덩달아 신나해요!", en: "Your creature gets excited too!" } },
      { id: "dm_ok", label: { ko: "보통이야", en: "It's okay" }, type: "serious", dnaEffects: [{ axis: "stability", delta: 0.005 }], affinityDelta: 1, outcome: { ko: "크리처가 고개를 끄덕여요.", en: "Your creature nods understandingly." } },
      { id: "dm_bad", label: { ko: "좀 힘들어...", en: "Not great..." }, type: "kind", dnaEffects: [{ axis: "empathy", delta: 0.005 }], affinityDelta: 2, outcome: { ko: "크리처가 다가와서 살짝 기대요.", en: "Your creature comes close and leans against you." } },
    ],
    triggerCondition: { minMessages: 1 },
    repeatable: true,
  },
];

/** Get narrative state from localStorage */
export function getNarrativeState(): NarrativeState {
  if (typeof window === "undefined") {
    return { completedEvents: [], choiceHistory: [], personalityTendency: { kind: 0, bold: 0, curious: 0, playful: 0, serious: 0, rebellious: 0 } };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { completedEvents: [], choiceHistory: [], personalityTendency: { kind: 0, bold: 0, curious: 0, playful: 0, serious: 0, rebellious: 0 } };
  }
  try {
    return JSON.parse(raw) as NarrativeState;
  } catch {
    return { completedEvents: [], choiceHistory: [], personalityTendency: { kind: 0, bold: 0, curious: 0, playful: 0, serious: 0, rebellious: 0 } };
  }
}

/** Save narrative state */
export function saveNarrativeState(state: NarrativeState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Get available story events based on current context */
export function getAvailableEvents(context: {
  totalMessages: number;
  affinity: number;
  genLevel: number;
  timeOfDay: string;
}): StoryEvent[] {
  const state = getNarrativeState();

  return STORY_EVENTS.filter((event) => {
    // Skip completed non-repeatable events
    if (!event.repeatable && state.completedEvents.includes(event.id)) return false;

    // Check trigger conditions
    const cond = event.triggerCondition;
    if (cond.minMessages && context.totalMessages < cond.minMessages) return false;
    if (cond.minAffinity && context.affinity < cond.minAffinity) return false;
    if (cond.minGenLevel && context.genLevel < cond.minGenLevel) return false;
    if (cond.timeOfDay && context.timeOfDay !== cond.timeOfDay) return false;
    if (cond.requiredPreviousChoice && !state.completedEvents.includes(cond.requiredPreviousChoice)) return false;

    return true;
  });
}

/** Make a story choice — returns DNA effects and outcome */
export function makeChoice(eventId: string, choiceId: string): {
  outcome: { ko: string; en: string };
  dnaEffects: { axis: string; delta: number }[];
  affinityDelta: number;
} | null {
  const event = STORY_EVENTS.find((e) => e.id === eventId);
  if (!event) return null;

  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) return null;

  const state = getNarrativeState();

  // Record choice
  state.choiceHistory.push({
    eventId,
    choiceId,
    timestamp: new Date().toISOString(),
  });

  // Mark event as completed
  if (!state.completedEvents.includes(eventId)) {
    state.completedEvents.push(eventId);
  }

  // Update personality tendency
  state.personalityTendency[choice.type] = (state.personalityTendency[choice.type] ?? 0) + 1;

  saveNarrativeState(state);

  return {
    outcome: choice.outcome,
    dnaEffects: choice.dnaEffects,
    affinityDelta: choice.affinityDelta,
  };
}

/** Get dominant personality tendency */
export function getDominantTendency(): NarrativeChoice | null {
  const state = getNarrativeState();
  const entries = Object.entries(state.personalityTendency) as [NarrativeChoice, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  if (sorted[0][1] === 0) return null;
  return sorted[0][0];
}

/** Get choice history for a specific event */
export function getEventChoice(eventId: string): string | null {
  const state = getNarrativeState();
  const entry = state.choiceHistory.find((h) => h.eventId === eventId);
  return entry?.choiceId ?? null;
}
