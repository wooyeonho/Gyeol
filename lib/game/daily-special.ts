/**
 * Daily Special Challenge — Wordle-inspired one-shot daily challenge.
 * One unique challenge per day. Fail = wait until tomorrow.
 * Success = special reward + streak.
 */

export interface DailySpecial {
  id: string;
  date: string; // YYYY-MM-DD
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  type: "riddle" | "trivia" | "emotion" | "creativity" | "memory";
  difficulty: number; // 1-5
  attempted: boolean;
  completed: boolean;
  reward: { coins: number; xp: number; specialItem?: string };
}

export interface DailySpecialState {
  currentChallenge: DailySpecial | null;
  streak: number; // Consecutive days completed
  totalCompleted: number;
  history: { date: string; completed: boolean }[];
}

const STORAGE_KEY = "gyeol_daily_special";

/** Challenge templates */
const CHALLENGE_POOL: Array<{
  type: DailySpecial["type"];
  title: { ko: string; en: string };
  description: { ko: string; en: string };
  difficulty: number;
}> = [
  // Riddles
  { type: "riddle", title: { ko: "수수께끼의 문", en: "Riddle Gate" }, description: { ko: "크리처가 낸 수수께끼를 풀어보세요", en: "Solve the riddle your creature poses" }, difficulty: 3 },
  { type: "riddle", title: { ko: "고대의 암호", en: "Ancient Cipher" }, description: { ko: "잊혀진 언어의 패턴을 해독하세요", en: "Decode the pattern of a forgotten language" }, difficulty: 4 },
  // Trivia
  { type: "trivia", title: { ko: "지식의 시험", en: "Knowledge Trial" }, description: { ko: "크리처에 대한 지식을 시험해보세요", en: "Test your knowledge about creatures" }, difficulty: 2 },
  { type: "trivia", title: { ko: "DNA 퀴즈", en: "DNA Quiz" }, description: { ko: "DNA 축에 대해 얼마나 알고 있나요?", en: "How much do you know about DNA axes?" }, difficulty: 3 },
  // Emotion
  { type: "emotion", title: { ko: "감정 공감", en: "Emotional Resonance" }, description: { ko: "크리처의 현재 기분을 정확히 맞춰보세요", en: "Guess your creature's exact current mood" }, difficulty: 2 },
  { type: "emotion", title: { ko: "마음의 거울", en: "Mirror of Hearts" }, description: { ko: "깊은 대화로 크리처의 숨겨진 감정을 발견하세요", en: "Discover hidden emotions through deep conversation" }, difficulty: 4 },
  // Creativity
  { type: "creativity", title: { ko: "창작의 불꽃", en: "Creative Spark" }, description: { ko: "주어진 주제로 크리처와 이야기를 만들어보세요", en: "Create a story with your creature on a given topic" }, difficulty: 3 },
  { type: "creativity", title: { ko: "노래 만들기", en: "Song Making" }, description: { ko: "크리처를 위한 짧은 노래를 만들어보세요", en: "Compose a short song for your creature" }, difficulty: 3 },
  // Memory
  { type: "memory", title: { ko: "기억력 도전", en: "Memory Challenge" }, description: { ko: "크리처와의 대화 내용을 기억하고 있나요?", en: "Do you remember your conversations?" }, difficulty: 2 },
  { type: "memory", title: { ko: "추억의 퍼즐", en: "Memory Puzzle" }, description: { ko: "과거 대화에서 중요한 순간을 찾아보세요", en: "Find important moments from past conversations" }, difficulty: 4 },
];

/** Seeded random for consistent daily selection */
function dailySeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Get today's date string */
function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Get daily special state */
export function getDailySpecialState(): DailySpecialState {
  if (typeof window === "undefined") {
    return { currentChallenge: null, streak: 0, totalCompleted: 0, history: [] };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { currentChallenge: null, streak: 0, totalCompleted: 0, history: [] };
  try {
    return JSON.parse(raw) as DailySpecialState;
  } catch {
    return { currentChallenge: null, streak: 0, totalCompleted: 0, history: [] };
  }
}

/** Save state */
function saveState(state: DailySpecialState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Get or generate today's daily special challenge */
export function getTodayChallenge(): DailySpecial {
  const state = getDailySpecialState();
  const today = getToday();

  // Already generated for today
  if (state.currentChallenge?.date === today) {
    return state.currentChallenge;
  }

  // Generate new challenge
  const seed = dailySeed(today);
  const template = CHALLENGE_POOL[seed % CHALLENGE_POOL.length];
  const challenge: DailySpecial = {
    id: `daily_${today}`,
    date: today,
    title: template.title,
    description: template.description,
    type: template.type,
    difficulty: template.difficulty,
    attempted: false,
    completed: false,
    reward: {
      coins: template.difficulty * 50,
      xp: template.difficulty * 30,
      specialItem: template.difficulty >= 4 ? "daily_special_token" : undefined,
    },
  };

  state.currentChallenge = challenge;
  saveState(state);
  return challenge;
}

/** Attempt the daily challenge */
export function attemptDailyChallenge(): DailySpecial {
  const state = getDailySpecialState();
  if (!state.currentChallenge || state.currentChallenge.attempted) {
    return state.currentChallenge ?? getTodayChallenge();
  }
  state.currentChallenge.attempted = true;
  saveState(state);
  return state.currentChallenge;
}

/** Complete the daily challenge */
export function completeDailyChallenge(): { reward: DailySpecial["reward"]; newStreak: number } {
  const state = getDailySpecialState();
  if (!state.currentChallenge || state.currentChallenge.completed) {
    return { reward: { coins: 0, xp: 0 }, newStreak: state.streak };
  }

  state.currentChallenge.completed = true;
  state.totalCompleted++;
  state.streak++;
  state.history.push({ date: state.currentChallenge.date, completed: true });
  if (state.history.length > 30) state.history = state.history.slice(-30);

  const reward = state.currentChallenge.reward;
  saveState(state);
  return { reward, newStreak: state.streak };
}

/** Fail the daily challenge (attempted but not completed) */
export function failDailyChallenge(): void {
  const state = getDailySpecialState();
  if (!state.currentChallenge) return;
  state.currentChallenge.attempted = true;
  state.streak = 0;
  state.history.push({ date: state.currentChallenge.date, completed: false });
  if (state.history.length > 30) state.history = state.history.slice(-30);
  saveState(state);
}

/** Check if today's challenge is available (not yet attempted) */
export function isDailyChallengeAvailable(): boolean {
  const challenge = getTodayChallenge();
  return !challenge.attempted;
}

/** Get challenge streak */
export function getDailyChallengeStreak(): number {
  return getDailySpecialState().streak;
}
