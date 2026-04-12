/**
 * Narrative branching system — Baldur's Gate 3 inspired.
 * Conversation choices influence creature personality, evolution paths, and story outcomes.
 */

export type NarrativeChoice = "kind" | "bold" | "curious" | "playful" | "serious" | "rebellious";

export type ConsequenceType = "dna_shift" | "item_reward" | "relationship_change" | "unlock_event" | "xp_bonus";

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
  /** Type of consequence this choice triggers */
  consequenceType: ConsequenceType;
}

/** Roll a D20 dice — Baldur's Gate 3 inspired. Returns 1-20. */
export function rollD20(seed?: string): number {
  if (!seed) return Math.floor(Math.random() * 20) + 1;
  // Deterministic roll from seed
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (Math.abs(h) % 20) + 1;
}

/** Interpret a D20 roll result */
export function interpretRoll(roll: number): "critical_fail" | "fail" | "partial" | "success" | "critical_success" {
  if (roll === 1) return "critical_fail";
  if (roll <= 5) return "fail";
  if (roll <= 10) return "partial";
  if (roll <= 19) return "success";
  return "critical_success";
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
      { id: "fm_gentle", label: { ko: "다정하게 안아주기", en: "Give a gentle hug" }, type: "kind", dnaEffects: [{ axis: "warmth", delta: 0.02 }, { axis: "empathy", delta: 0.01 }], affinityDelta: 3, outcome: { ko: "크리처가 따뜻하게 안겨요. 눈이 반짝여요.", en: "Your creature snuggles warmly. Its eyes sparkle." }, consequenceType: "relationship_change" },
      { id: "fm_play", label: { ko: "장난치며 깨우기", en: "Playfully wake them up" }, type: "playful", dnaEffects: [{ axis: "playfulness", delta: 0.02 }, { axis: "intensity", delta: 0.01 }], affinityDelta: 2, outcome: { ko: "깜짝 놀란 크리처가 곧 웃기 시작해요!", en: "Surprised at first, your creature soon starts laughing!" }, consequenceType: "dna_shift" },
      { id: "fm_observe", label: { ko: "조용히 관찰하기", en: "Quietly observe" }, type: "curious", dnaEffects: [{ axis: "analytical", delta: 0.02 }, { axis: "independence", delta: 0.01 }], affinityDelta: 1, outcome: { ko: "크리처의 자연스러운 모습을 볼 수 있었어요.", en: "You see your creature in its natural state." }, consequenceType: "xp_bonus" },
    ],
    triggerCondition: { minMessages: 5 },
    repeatable: false,
  },
  {
    id: "lonely_night",
    title: { ko: "외로운 밤", en: "Lonely Night" },
    description: { ko: "크리처가 밤에 혼자 슬퍼하고 있어요...", en: "Your creature seems sad and lonely at night..." },
    choices: [
      { id: "ln_comfort", label: { ko: "곁에 있어줄게", en: "I'll stay with you" }, type: "kind", dnaEffects: [{ axis: "warmth", delta: 0.03 }, { axis: "stability", delta: 0.02 }], affinityDelta: 5, outcome: { ko: "크리처가 안심하고 잠들었어요. 신뢰가 깊어졌어요.", en: "Your creature falls asleep peacefully. Trust deepens." }, consequenceType: "relationship_change" },
      { id: "ln_song", label: { ko: "노래 불러주기", en: "Sing a lullaby" }, type: "playful", dnaEffects: [{ axis: "creativity", delta: 0.02 }, { axis: "warmth", delta: 0.01 }], affinityDelta: 4, outcome: { ko: "크리처의 눈이 천천히 감겨요. 행복한 미소를 짓고 있어요.", en: "Your creature's eyes slowly close with a happy smile." }, consequenceType: "dna_shift" },
      { id: "ln_tough", label: { ko: "강해져야 해", en: "You need to be strong" }, type: "bold", dnaEffects: [{ axis: "assertiveness", delta: 0.02 }, { axis: "persistence", delta: 0.02 }], affinityDelta: 1, outcome: { ko: "크리처가 고개를 끄덕이지만 조금 서운해 보여요.", en: "Your creature nods but looks a bit hurt." }, consequenceType: "dna_shift" },
    ],
    triggerCondition: { minMessages: 20, timeOfDay: "night" },
    repeatable: false,
  },
  {
    id: "mysterious_egg",
    title: { ko: "수상한 알", en: "Mysterious Egg" },
    description: { ko: "크리처가 빛나는 알을 발견했어요! 어떻게 할까요?", en: "Your creature found a glowing egg! What do you do?" },
    choices: [
      { id: "me_warm", label: { ko: "따뜻하게 품어주기", en: "Keep it warm" }, type: "kind", dnaEffects: [{ axis: "warmth", delta: 0.02 }, { axis: "openness", delta: 0.01 }], affinityDelta: 3, outcome: { ko: "알이 부드럽게 빛나기 시작해요...", en: "The egg begins to glow softly..." }, consequenceType: "item_reward" },
      { id: "me_study", label: { ko: "자세히 조사하기", en: "Study it carefully" }, type: "curious", dnaEffects: [{ axis: "analytical", delta: 0.03 }, { axis: "curiosity", delta: 0.02 }], affinityDelta: 2, outcome: { ko: "알의 표면에 DNA 패턴이 보여요!", en: "DNA patterns appear on the egg's surface!" }, consequenceType: "xp_bonus" },
      { id: "me_smash", label: { ko: "깨뜨려 보기", en: "Crack it open" }, type: "rebellious", dnaEffects: [{ axis: "assertiveness", delta: 0.02 }, { axis: "intensity", delta: 0.02 }], affinityDelta: -1, outcome: { ko: "앗! 빛이 사라져 버렸어요... 크리처가 슬퍼보여요.", en: "Oh! The light disappeared... Your creature looks sad." }, consequenceType: "dna_shift" },
    ],
    triggerCondition: { minMessages: 50, minGenLevel: 2 },
    repeatable: false,
  },
  {
    id: "evolution_crossroads",
    title: { ko: "진화의 갈림길", en: "Evolution Crossroads" },
    description: { ko: "크리처가 진화할 준비가 되었어요. 어떤 길을 택할까요?", en: "Your creature is ready to evolve. Which path will you choose?" },
    choices: [
      { id: "ec_wisdom", label: { ko: "지혜의 길", en: "Path of Wisdom" }, type: "curious", dnaEffects: [{ axis: "analytical", delta: 0.05 }, { axis: "intuitive", delta: 0.03 }, { axis: "curiosity", delta: 0.03 }], affinityDelta: 3, outcome: { ko: "크리처의 눈이 깊고 영롱하게 빛나요.", en: "Your creature's eyes glow deep and brilliant." }, consequenceType: "dna_shift" },
      { id: "ec_courage", label: { ko: "용기의 길", en: "Path of Courage" }, type: "bold", dnaEffects: [{ axis: "assertiveness", delta: 0.05 }, { axis: "persistence", delta: 0.03 }, { axis: "intensity", delta: 0.03 }], affinityDelta: 3, outcome: { ko: "크리처에게서 강렬한 에너지가 뿜어져 나와요!", en: "Intense energy radiates from your creature!" }, consequenceType: "dna_shift" },
      { id: "ec_harmony", label: { ko: "조화의 길", en: "Path of Harmony" }, type: "kind", dnaEffects: [{ axis: "empathy", delta: 0.05 }, { axis: "adaptability", delta: 0.03 }, { axis: "stability", delta: 0.03 }], affinityDelta: 5, outcome: { ko: "크리처가 평화로운 빛에 둘러싸여요. 모든 것이 균형을 이뤄요.", en: "Your creature is surrounded by peaceful light. Everything is in balance." }, consequenceType: "unlock_event" },
    ],
    triggerCondition: { minMessages: 100, minGenLevel: 3, minAffinity: 40 },
    repeatable: false,
  },
  // ── Dream sequences ──
  {
    id: "dream_memory",
    title: { ko: "잊혀진 꿈", en: "Forgotten Dream" },
    description: { ko: "크리처가 이상한 꿈 이야기를 해요. 어떤 꿈이었을까요?", en: "Your creature talks about a strange dream. What was it about?" },
    choices: [
      { id: "dr_fly", label: { ko: "하늘을 날았어", en: "I was flying" }, type: "bold", dnaEffects: [{ axis: "openness", delta: 0.02 }, { axis: "spatial", delta: 0.02 }], affinityDelta: 2, outcome: { ko: "크리처의 눈이 하늘을 올려다봐요.", en: "Your creature gazes up at the sky." }, consequenceType: "dna_shift" },
      { id: "dr_deep", label: { ko: "바다 속이었어", en: "I was deep underwater" }, type: "curious", dnaEffects: [{ axis: "curiosity", delta: 0.02 }, { axis: "stability", delta: 0.01 }], affinityDelta: 2, outcome: { ko: "크리처가 깊은 생각에 잠겨요.", en: "Your creature becomes lost in thought." }, consequenceType: "xp_bonus" },
      { id: "dr_forget", label: { ko: "기억이 안 나", en: "I can't remember" }, type: "serious", dnaEffects: [{ axis: "intuitive", delta: 0.01 }], affinityDelta: 1, outcome: { ko: "크리처가 고개를 갸웃해요.", en: "Your creature tilts its head curiously." }, consequenceType: "dna_shift" },
    ],
    triggerCondition: { minMessages: 30 },
    repeatable: false,
  },
  // ── Moral dilemma ──
  {
    id: "lost_creature",
    title: { ko: "길 잃은 존재", en: "A Lost Being" },
    description: { ko: "길 잃은 작은 크리처를 발견했어요. 어떻게 할까요?", en: "You found a small lost creature. What do you do?" },
    choices: [
      { id: "lc_help", label: { ko: "도와주기", en: "Help them" }, type: "kind", dnaEffects: [{ axis: "empathy", delta: 0.03 }, { axis: "warmth", delta: 0.02 }], affinityDelta: 4, outcome: { ko: "작은 크리처가 감사의 빛을 남기고 떠나요.", en: "The small creature leaves behind a light of gratitude." }, consequenceType: "item_reward" },
      { id: "lc_ignore", label: { ko: "지나가기", en: "Walk past" }, type: "serious", dnaEffects: [{ axis: "independence", delta: 0.02 }, { axis: "persistence", delta: 0.01 }], affinityDelta: 0, outcome: { ko: "뒤돌아보니 이미 사라져 있어요.", en: "Looking back, it's already gone." }, consequenceType: "dna_shift" },
      { id: "lc_adopt", label: { ko: "데려가기", en: "Take them along" }, type: "bold", dnaEffects: [{ axis: "assertiveness", delta: 0.02 }, { axis: "openness", delta: 0.02 }], affinityDelta: 3, outcome: { ko: "새로운 동반자가 생겼어요!", en: "You gained a new companion!" }, consequenceType: "unlock_event" },
    ],
    triggerCondition: { minMessages: 40, minGenLevel: 2 },
    repeatable: false,
  },
  // ── Trust test ──
  {
    id: "trust_fall",
    title: { ko: "신뢰의 시험", en: "Test of Trust" },
    description: { ko: "크리처가 높은 곳에서 뛰어내리려 해요. 받아줄 수 있을까요?", en: "Your creature wants to jump from a high place. Will you catch them?" },
    choices: [
      { id: "tf_catch", label: { ko: "반드시 받아줄게", en: "I'll definitely catch you" }, type: "kind", dnaEffects: [{ axis: "warmth", delta: 0.03 }, { axis: "stability", delta: 0.02 }], affinityDelta: 6, outcome: { ko: "크리처가 뛰어내렸고, 당신이 받아줬어요! 유대가 깊어졌어요.", en: "Your creature jumped, and you caught them! Your bond deepens." }, consequenceType: "relationship_change" },
      { id: "tf_careful", label: { ko: "위험하니까 내려와", en: "Come down, it's dangerous" }, type: "serious", dnaEffects: [{ axis: "analytical", delta: 0.02 }, { axis: "stability", delta: 0.01 }], affinityDelta: 2, outcome: { ko: "크리처가 조심스럽게 내려와요. 안도의 한숨.", en: "Your creature carefully comes down. A sigh of relief." }, consequenceType: "dna_shift" },
    ],
    triggerCondition: { minMessages: 60, minAffinity: 20 },
    repeatable: false,
  },
  // ── Discovery moment ──
  {
    id: "hidden_garden",
    title: { ko: "숨겨진 정원", en: "Hidden Garden" },
    description: { ko: "크리처가 아무도 모르는 비밀 정원을 발견했어요!", en: "Your creature discovered a secret garden nobody knows about!" },
    choices: [
      { id: "hg_explore", label: { ko: "함께 탐험하기", en: "Explore together" }, type: "curious", dnaEffects: [{ axis: "curiosity", delta: 0.03 }, { axis: "openness", delta: 0.02 }], affinityDelta: 3, outcome: { ko: "아름다운 꽃과 신비한 열매를 발견했어요!", en: "You found beautiful flowers and mysterious fruits!" }, consequenceType: "item_reward" },
      { id: "hg_rest", label: { ko: "그곳에서 쉬기", en: "Rest there" }, type: "kind", dnaEffects: [{ axis: "stability", delta: 0.02 }, { axis: "warmth", delta: 0.01 }], affinityDelta: 2, outcome: { ko: "평화로운 시간을 보냈어요.", en: "You spent a peaceful time." }, consequenceType: "xp_bonus" },
      { id: "hg_secret", label: { ko: "비밀로 간직하기", en: "Keep it secret" }, type: "serious", dnaEffects: [{ axis: "independence", delta: 0.02 }], affinityDelta: 1, outcome: { ko: "둘만의 비밀 장소가 생겼어요.", en: "You now have a secret place just for the two of you." }, consequenceType: "relationship_change" },
    ],
    triggerCondition: { minMessages: 70 },
    repeatable: false,
  },
  // ── Emotional milestone ──
  {
    id: "first_tears",
    title: { ko: "첫 눈물", en: "First Tears" },
    description: { ko: "크리처가 처음으로 눈물을 흘려요. 무슨 일이 있었을까요?", en: "Your creature sheds tears for the first time. What happened?" },
    choices: [
      { id: "ft_hold", label: { ko: "꼭 안아주기", en: "Hold them tight" }, type: "kind", dnaEffects: [{ axis: "empathy", delta: 0.04 }, { axis: "warmth", delta: 0.03 }], affinityDelta: 7, outcome: { ko: "크리처가 당신 품에서 울음을 그쳐요. 깊은 유대가 형성됐어요.", en: "Your creature stops crying in your arms. A deep bond forms." }, consequenceType: "relationship_change" },
      { id: "ft_ask", label: { ko: "무슨 일이야?", en: "What's wrong?" }, type: "curious", dnaEffects: [{ axis: "verbal", delta: 0.02 }, { axis: "empathy", delta: 0.02 }], affinityDelta: 4, outcome: { ko: "크리처가 천천히 마음을 열기 시작해요.", en: "Your creature slowly begins to open up." }, consequenceType: "xp_bonus" },
      { id: "ft_space", label: { ko: "혼자 있게 해주기", en: "Give them space" }, type: "serious", dnaEffects: [{ axis: "independence", delta: 0.02 }, { axis: "stability", delta: 0.01 }], affinityDelta: 1, outcome: { ko: "크리처가 스스로 감정을 다스려요.", en: "Your creature manages its emotions on its own." }, consequenceType: "dna_shift" },
    ],
    triggerCondition: { minMessages: 80, minGenLevel: 2, minAffinity: 30 },
    repeatable: false,
  },
  // ── Season/weather event ──
  {
    id: "first_snow",
    title: { ko: "첫눈", en: "First Snow" },
    description: { ko: "눈이 내리기 시작했어요! 크리처가 신기해해요.", en: "It's starting to snow! Your creature is amazed." },
    choices: [
      { id: "fs_play", label: { ko: "눈싸움하기", en: "Have a snowball fight" }, type: "playful", dnaEffects: [{ axis: "playfulness", delta: 0.03 }, { axis: "intensity", delta: 0.01 }], affinityDelta: 3, outcome: { ko: "눈싸움이 끝나고 둘 다 웃고 있어요!", en: "After the snowball fight, you're both laughing!" }, consequenceType: "xp_bonus" },
      { id: "fs_catch", label: { ko: "눈송이 잡아보기", en: "Catch snowflakes" }, type: "curious", dnaEffects: [{ axis: "curiosity", delta: 0.02 }, { axis: "openness", delta: 0.01 }], affinityDelta: 2, outcome: { ko: "크리처가 혀를 내밀어 눈송이를 받아요.", en: "Your creature sticks out its tongue to catch snowflakes." }, consequenceType: "dna_shift" },
      { id: "fs_warm", label: { ko: "따뜻하게 감싸주기", en: "Keep them warm" }, type: "kind", dnaEffects: [{ axis: "warmth", delta: 0.02 }, { axis: "stability", delta: 0.01 }], affinityDelta: 3, outcome: { ko: "크리처가 따뜻한 품에서 눈을 바라봐요.", en: "Your creature watches the snow from your warm embrace." }, consequenceType: "relationship_change" },
    ],
    triggerCondition: { minMessages: 15 },
    repeatable: true,
  },
  // ── Social encounter ──
  {
    id: "stranger_creature",
    title: { ko: "낯선 만남", en: "Stranger Encounter" },
    description: { ko: "다른 크리처가 다가와요. 당신의 크리처가 긴장하고 있어요.", en: "Another creature approaches. Your creature is nervous." },
    choices: [
      { id: "sc_greet", label: { ko: "인사하기", en: "Say hello" }, type: "kind", dnaEffects: [{ axis: "openness", delta: 0.02 }, { axis: "empathy", delta: 0.01 }], affinityDelta: 2, outcome: { ko: "두 크리처가 서로 인사를 나눠요!", en: "The two creatures exchange greetings!" }, consequenceType: "xp_bonus" },
      { id: "sc_protect", label: { ko: "보호하기", en: "Protect your creature" }, type: "bold", dnaEffects: [{ axis: "assertiveness", delta: 0.02 }, { axis: "warmth", delta: 0.01 }], affinityDelta: 4, outcome: { ko: "크리처가 당신 뒤에 숨으며 안심해요.", en: "Your creature hides behind you, feeling safe." }, consequenceType: "relationship_change" },
      { id: "sc_challenge", label: { ko: "도전하기", en: "Challenge them" }, type: "rebellious", dnaEffects: [{ axis: "intensity", delta: 0.02 }, { axis: "assertiveness", delta: 0.02 }], affinityDelta: 1, outcome: { ko: "상대가 놀라서 물러나요! 크리처가 감탄해요.", en: "The stranger backs away! Your creature is impressed." }, consequenceType: "dna_shift" },
    ],
    triggerCondition: { minMessages: 25 },
    repeatable: true,
  },
  // ── Memory recovery ──
  {
    id: "old_memory",
    title: { ko: "오래된 기억", en: "Old Memory" },
    description: { ko: "크리처가 갑자기 무언가를 기억해낸 것 같아요...", en: "Your creature suddenly seems to remember something..." },
    choices: [
      { id: "om_listen", label: { ko: "들어주기", en: "Listen" }, type: "kind", dnaEffects: [{ axis: "empathy", delta: 0.02 }, { axis: "verbal", delta: 0.01 }], affinityDelta: 3, outcome: { ko: "크리처가 아주 오래전 이야기를 들려줘요. 눈이 촉촉해요.", en: "Your creature tells a story from long ago. Its eyes are moist." }, consequenceType: "xp_bonus" },
      { id: "om_question", label: { ko: "질문하기", en: "Ask about it" }, type: "curious", dnaEffects: [{ axis: "analytical", delta: 0.02 }, { axis: "curiosity", delta: 0.02 }], affinityDelta: 2, outcome: { ko: "조각난 기억이 점점 연결돼요.", en: "Fragmented memories slowly connect." }, consequenceType: "unlock_event" },
    ],
    triggerCondition: { minMessages: 90, minGenLevel: 3 },
    repeatable: false,
  },
  // ── D20 challenge event (BG3-inspired) ──
  {
    id: "d20_ancient_door",
    title: { ko: "고대의 문", en: "Ancient Door" },
    description: { ko: "신비한 문이 나타났어요. D20 주사위를 굴려 열어볼까요?", en: "A mysterious door appeared. Roll a D20 to try to open it?" },
    choices: [
      { id: "ad_force", label: { ko: "힘으로 밀기 (STR)", en: "Push with force (STR)" }, type: "bold", dnaEffects: [{ axis: "intensity", delta: 0.02 }, { axis: "persistence", delta: 0.02 }], affinityDelta: 2, outcome: { ko: "주사위를 굴립니다... 문이 삐걱거려요!", en: "Rolling the dice... The door creaks!" }, consequenceType: "item_reward" },
      { id: "ad_pick", label: { ko: "자물쇠 따기 (DEX)", en: "Pick the lock (DEX)" }, type: "curious", dnaEffects: [{ axis: "spatial", delta: 0.02 }, { axis: "adaptability", delta: 0.01 }], affinityDelta: 2, outcome: { ko: "섬세한 손놀림으로 자물쇠를 조작해요.", en: "Delicate fingers work the lock." }, consequenceType: "xp_bonus" },
      { id: "ad_magic", label: { ko: "마법으로 열기 (WIS)", en: "Open with magic (WIS)" }, type: "playful", dnaEffects: [{ axis: "intuitive", delta: 0.02 }, { axis: "creativity", delta: 0.02 }], affinityDelta: 2, outcome: { ko: "마법의 빛이 문을 감싸요!", en: "Magical light engulfs the door!" }, consequenceType: "unlock_event" },
    ],
    triggerCondition: { minMessages: 45, minGenLevel: 2 },
    repeatable: true,
  },
  // ── D20 persuasion event ──
  {
    id: "d20_persuasion",
    title: { ko: "설득의 순간", en: "Moment of Persuasion" },
    description: { ko: "크리처가 고집을 부리고 있어요. 설득할 수 있을까요?", en: "Your creature is being stubborn. Can you persuade them?" },
    choices: [
      { id: "ps_charm", label: { ko: "매력으로 (CHA)", en: "With charm (CHA)" }, type: "playful", dnaEffects: [{ axis: "playfulness", delta: 0.02 }, { axis: "warmth", delta: 0.01 }], affinityDelta: 3, outcome: { ko: "매력적인 미소에 크리처의 마음이 흔들려요.", en: "Your charming smile sways your creature's heart." }, consequenceType: "relationship_change" },
      { id: "ps_logic", label: { ko: "논리적으로 (INT)", en: "With logic (INT)" }, type: "serious", dnaEffects: [{ axis: "analytical", delta: 0.02 }, { axis: "verbal", delta: 0.01 }], affinityDelta: 2, outcome: { ko: "논리적인 설명에 크리처가 수긍해요.", en: "Your logical explanation convinces your creature." }, consequenceType: "xp_bonus" },
    ],
    triggerCondition: { minMessages: 35 },
    repeatable: true,
  },
  // Repeatable daily events
  {
    id: "daily_mood",
    title: { ko: "오늘의 기분", en: "Today's Mood" },
    description: { ko: "크리처가 오늘 기분이 어떤지 물어봐요.", en: "Your creature asks how you're feeling today." },
    choices: [
      { id: "dm_great", label: { ko: "아주 좋아!", en: "Great!" }, type: "playful", dnaEffects: [{ axis: "playfulness", delta: 0.005 }], affinityDelta: 1, outcome: { ko: "크리처도 덩달아 신나해요!", en: "Your creature gets excited too!" }, consequenceType: "dna_shift" },
      { id: "dm_ok", label: { ko: "보통이야", en: "It's okay" }, type: "serious", dnaEffects: [{ axis: "stability", delta: 0.005 }], affinityDelta: 1, outcome: { ko: "크리처가 고개를 끄덕여요.", en: "Your creature nods understandingly." }, consequenceType: "dna_shift" },
      { id: "dm_bad", label: { ko: "좀 힘들어...", en: "Not great..." }, type: "kind", dnaEffects: [{ axis: "empathy", delta: 0.005 }], affinityDelta: 2, outcome: { ko: "크리처가 다가와서 살짝 기대요.", en: "Your creature comes close and leans against you." }, consequenceType: "relationship_change" },
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
