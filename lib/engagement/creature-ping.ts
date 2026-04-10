/**
 * BeReal-style Daily Random Creature Ping
 *
 * Once per day, at a random hour between 9am-9pm, the creature
 * initiates a conversation with "지금 뭐해?" or a mood-based prompt.
 * This creates a "surprise" engagement moment — the creature feels alive.
 *
 * Stored in localStorage to track last ping date and scheduled hour.
 */

const PING_KEY = "gyeol_creature_ping_v1";

interface PingState {
  /** Last date a ping was delivered (YYYY-MM-DD) */
  lastPingDate: string | null;
  /** Scheduled hour for today's ping (9-21) */
  scheduledHour: number;
  /** Whether today's ping was seen */
  seen: boolean;
}

const RANDOM_PROMPTS = {
  default: [
    "지금 뭐해?",
    "오늘 하루 어때?",
    "심심해... 놀아줘!",
    "뭔가 재밌는 거 없어?",
    "오늘 기분이 어때?",
  ],
  happy: [
    "오늘 기분 좋아 보여!",
    "같이 놀자! 🎉",
    "뭔가 좋은 일 있었어?",
  ],
  sad: [
    "괜찮아?",
    "뭔가 걱정되는 거 있어?",
    "얘기 들어줄게...",
  ],
  curious: [
    "오늘 뭐 새로운 거 배웠어?",
    "궁금한 게 있어!",
    "이것 좀 알려줘!",
  ],
  sleepy: [
    "아... 졸려...",
    "같이 낮잠 잘까?",
    "오늘 좀 피곤해...",
  ],
} as const;

function readPingState(): PingState {
  if (typeof window === "undefined") {
    return { lastPingDate: null, scheduledHour: 12, seen: false };
  }
  try {
    const raw = localStorage.getItem(PING_KEY);
    if (!raw) return { lastPingDate: null, scheduledHour: randomHour(), seen: false };
    return JSON.parse(raw) as PingState;
  } catch {
    return { lastPingDate: null, scheduledHour: randomHour(), seen: false };
  }
}

function writePingState(state: PingState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PING_KEY, JSON.stringify(state));
  } catch { /* non-fatal */ }
}

function randomHour(): number {
  return 9 + Math.floor(Math.random() * 13); // 9-21
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check if the creature should ping the user right now.
 * Call this periodically (e.g., on app focus or every few minutes).
 */
export function shouldCreaturePing(): boolean {
  const state = readPingState();
  const today = todayKey();
  const currentHour = new Date().getHours();

  // Already pinged today
  if (state.lastPingDate === today) return false;

  // Schedule a new hour if no state for today
  if (state.lastPingDate !== today) {
    // Ensure we have a scheduled hour for today
    if (!state.scheduledHour || state.lastPingDate !== today) {
      const newState: PingState = {
        lastPingDate: null,
        scheduledHour: randomHour(),
        seen: false,
      };
      writePingState(newState);
      // Check if current hour already passed the scheduled time
      return currentHour >= newState.scheduledHour;
    }
  }

  return currentHour >= state.scheduledHour;
}

/**
 * Get a random prompt for the creature ping, themed by mood.
 */
export function getCreaturePingPrompt(mood?: string | null): string {
  let pool: readonly string[];
  if (mood && mood in RANDOM_PROMPTS) {
    pool = RANDOM_PROMPTS[mood as keyof typeof RANDOM_PROMPTS];
  } else {
    pool = RANDOM_PROMPTS.default;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Mark today's ping as delivered.
 */
export function markPingDelivered(): void {
  writePingState({
    lastPingDate: todayKey(),
    scheduledHour: randomHour(),
    seen: false,
  });
}

/**
 * Mark today's ping as seen by the user.
 */
export function markPingSeen(): void {
  const state = readPingState();
  writePingState({ ...state, seen: true });
}

/**
 * Get the current ping state (for UI display).
 */
export function getCreaturePingState(): PingState {
  return readPingState();
}
