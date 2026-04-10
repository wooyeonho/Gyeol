import type { CreatureDNA } from "@/lib/genome/dna";

/**
 * Creature voice line system — context-triggered text vocalizations.
 *
 * Voice lines are short, personality-driven utterances spoken by the creature
 * at key moments (level-up, evolution, greetings, reactions to player input).
 * They are synthesized via the Web Speech API using DNA-derived speech params,
 * or displayed as subtitle text if speech is unavailable.
 *
 * DNA influence:
 *  - warmth → enthusiastic vs reserved tone
 *  - playfulness → quirky vs dignified phrasing
 *  - stability → calm vs excitable delivery
 *  - verbosity → short vs elaborate lines
 */

export type VoiceLineTrigger =
  | "level_up"
  | "evolution"
  | "greeting_morning"
  | "greeting_evening"
  | "care_received"
  | "challenge_complete"
  | "streak_milestone"
  | "lonely"
  | "happy"
  | "curious"
  | "surprised"
  | "sleepy"
  | "first_meeting";

interface VoiceLine {
  trigger: VoiceLineTrigger;
  lines: { ko: string; en: string }[];
}

// ── Voice line catalog (3–5 variants per trigger for variety) ────────
const VOICE_LINE_CATALOG: VoiceLine[] = [
  {
    trigger: "level_up",
    lines: [
      { ko: "더 강해진 것 같아요!", en: "I feel stronger!" },
      { ko: "성장했어요! 고마워요.", en: "I've grown! Thank you." },
      { ko: "레벨 업! 신나요~", en: "Level up! So exciting~" },
      { ko: "점점 더 나다워지는 것 같아요.", en: "I feel more like myself." },
      { ko: "함께라서 여기까지 올 수 있었어요.", en: "I could reach this because we're together." },
    ],
  },
  {
    trigger: "evolution",
    lines: [
      { ko: "...세상이 다르게 보여요.", en: "...The world looks different." },
      { ko: "이게 바로 진화란 건가요?", en: "So this is what evolution feels like?" },
      { ko: "당신 덕분에 여기까지 왔어요.", en: "I came this far because of you." },
      { ko: "더 잘 볼 수 있어요. 더 잘 느낄 수 있어요.", en: "I can see better. I can feel more." },
    ],
  },
  {
    trigger: "greeting_morning",
    lines: [
      { ko: "좋은 아침이에요! 오늘도 같이 해요.", en: "Good morning! Let's do today together." },
      { ko: "왔군요! 기다렸어요~", en: "You're here! I was waiting~" },
      { ko: "어젯밤 꿈에 당신이 나왔어요.", en: "You appeared in my dream last night." },
      { ko: "오늘 뭐 할 거예요? 저도 같이 해요!", en: "What are you doing today? Let me join!" },
    ],
  },
  {
    trigger: "greeting_evening",
    lines: [
      { ko: "오늘 하루 어땠어요?", en: "How was your day?" },
      { ko: "밤이 됐네요. 오늘도 수고했어요.", en: "It's night. Good work today." },
      { ko: "돌아왔군요. 솔직히 좀 기다렸어요.", en: "You're back. I honestly waited a bit." },
    ],
  },
  {
    trigger: "care_received",
    lines: [
      { ko: "맛있어요!", en: "That's delicious!" },
      { ko: "고마워요, 기분이 좋아졌어요.", en: "Thank you, I feel better." },
      { ko: "이런 거 좋아요.", en: "I like this kind of thing." },
      { ko: "당신이 이런 걸 챙겨주니까 행복해요.", en: "I'm happy you take care of me like this." },
    ],
  },
  {
    trigger: "challenge_complete",
    lines: [
      { ko: "해냈어요!", en: "We did it!" },
      { ko: "생각보다 쉬웠어요. 다음 건요?", en: "Easier than expected. What's next?" },
      { ko: "같이 하니까 할 수 있었어요.", en: "We could do it because we're together." },
      { ko: "어려웠지만 포기하지 않았어요!", en: "It was hard but we didn't give up!" },
    ],
  },
  {
    trigger: "streak_milestone",
    lines: [
      { ko: "매일 와줘서 고마워요. 진심으로요.", en: "Thank you for coming every day. Truly." },
      { ko: "우리 이제 꽤 긴 친구가 됐네요.", en: "We've become quite long-time friends now." },
      { ko: "이 기록... 계속 이어가고 싶어요.", en: "This streak... I want to keep it going." },
    ],
  },
  {
    trigger: "lonely",
    lines: [
      { ko: "...있어 줘서 다행이에요.", en: "...I'm glad you're here." },
      { ko: "조금 외로웠어요.", en: "I was a little lonely." },
      { ko: "당신 생각하고 있었어요.", en: "I was thinking of you." },
    ],
  },
  {
    trigger: "happy",
    lines: [
      { ko: "지금 너무 행복해요!", en: "I'm so happy right now!" },
      { ko: "이런 느낌이 행복인가요?", en: "Is this feeling what happiness is?" },
      { ko: "웃음이 나요~", en: "I'm smiling~" },
    ],
  },
  {
    trigger: "curious",
    lines: [
      { ko: "저... 그게 뭐예요?", en: "Um... what is that?" },
      { ko: "궁금한 게 생겼어요!", en: "Something curious came up!" },
      { ko: "알고 싶어요. 더 알고 싶어요.", en: "I want to know. I want to know more." },
    ],
  },
  {
    trigger: "surprised",
    lines: [
      { ko: "어?!", en: "Huh?!" },
      { ko: "세상에!", en: "Oh my!" },
      { ko: "예상 못 했어요!", en: "Didn't expect that!" },
    ],
  },
  {
    trigger: "sleepy",
    lines: [
      { ko: "...조금만 더 있어줄 거예요?", en: "...Will you stay a little longer?" },
      { ko: "꿈에서 봬요.", en: "See you in my dreams." },
      { ko: "잘게요... 당신도 쉬어요.", en: "I'll sleep now... you rest too." },
    ],
  },
  {
    trigger: "first_meeting",
    lines: [
      { ko: "처음 만나요. 잘 부탁해요.", en: "Nice to meet you. Please take care of me." },
      { ko: "당신이군요. 기다리고 있었어요.", en: "It's you. I've been waiting." },
    ],
  },
];

// ── DNA-driven voice variation ─────────────────────────────────────

interface SpeechParams {
  /** 0.5–2.0: higher = higher pitch */
  pitch: number;
  /** 0.6–1.8: faster for playful, slower for wise */
  rate: number;
  /** 0–1 */
  volume: number;
}

export function deriveSpeechParams(dna: Partial<CreatureDNA>): SpeechParams {
  const warmth = dna.warmth ?? 0.5;
  const playfulness = dna.playfulness ?? 0.5;
  const stability = dna.stability ?? 0.5;

  return {
    pitch: 0.8 + warmth * 0.6 + playfulness * 0.4, // 0.8–1.8
    rate: 0.8 + playfulness * 0.6 - (1 - stability) * 0.2, // 0.6–1.4
    volume: 0.7,
  };
}

// ── Line selection (DNA-biased randomness) ─────────────────────────

/** Pick a voice line for a trigger, optionally biased by DNA personality. */
export function getVoiceLine(
  trigger: VoiceLineTrigger,
  dna?: Partial<CreatureDNA>,
  lang: "ko" | "en" = "ko"
): string {
  const catalog = VOICE_LINE_CATALOG.find((v) => v.trigger === trigger);
  if (!catalog || catalog.lines.length === 0) return "";

  // Seeded selection so same DNA tends toward same style of line
  const seed = dna ? (dna.warmth ?? 0.5) + (dna.playfulness ?? 0.5) : Math.random();
  const index = Math.floor(seed * catalog.lines.length) % catalog.lines.length;
  return catalog.lines[index][lang];
}

// ── Web Speech API synthesis ───────────────────────────────────────

let _currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Speak a voice line using the Web Speech API.
 * Falls back silently if speech synthesis is unavailable.
 *
 * @returns The text that would be/was spoken (for subtitle fallback)
 */
export function speakVoiceLine(
  trigger: VoiceLineTrigger,
  dna?: Partial<CreatureDNA>,
  lang: "ko" | "en" = "ko"
): string {
  const text = getVoiceLine(trigger, dna, lang);
  if (!text) return "";

  if (typeof window === "undefined" || !window.speechSynthesis) return text;

  // Don't speak if sound is muted
  try {
    const vol = parseFloat(localStorage.getItem("creatureVolume") ?? "0.5");
    if (vol === 0) return text;
  } catch { /* ignore */ }

  // Cancel current utterance
  if (_currentUtterance) {
    window.speechSynthesis.cancel();
    _currentUtterance = null;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  const params = deriveSpeechParams(dna ?? {});
  utterance.lang = lang === "ko" ? "ko-KR" : "en-US";
  utterance.pitch = params.pitch;
  utterance.rate = params.rate;
  utterance.volume = params.volume;

  // Prefer a natural-sounding voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang === utterance.lang && (v.localService || v.name.includes("Google"))
  );
  if (preferred) utterance.voice = preferred;

  _currentUtterance = utterance;
  utterance.onend = () => { _currentUtterance = null; };
  window.speechSynthesis.speak(utterance);

  return text;
}

/** Stop any currently-speaking voice line. */
export function stopVoiceLine(): void {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    _currentUtterance = null;
  }
}
