/**
 * Proactive Conversation Starters.
 *
 * Synthesized from:
 *  - Replika ("I was thinking about you today…")
 *  - Character.ai (scene-seeded openers)
 *  - Pi (ambient check-ins)
 *  - Duolingo's streak nudge (but emotionally grounded, not guilt-tripping)
 *
 * Generates a set of candidate opener lines the creature can push via a
 * notification or show as a "What's on my mind" card at the top of /chat.
 *
 * This is a pure function over context signals — no LLM call — so it is
 * cheap to run in a cron or on every page load. The LLM can expand the
 * chosen seed into a full paragraph.
 */

import type { Mood } from "@/lib/identity/aura";

export type ProactiveContext = {
  /** Seconds since the user's last visit. */
  secondsSinceLastVisit: number;
  /** User's local hour 0-23 when the starter is generated. */
  localHour: number;
  /** Current streak day count. */
  streakDays: number;
  /** Current mood of the creature. */
  creatureMood: Mood;
  /** Titles / summaries of the 3 most recent memories (most recent first). */
  recentMemoryTitles: string[];
  /** Days until next evolution, if known. */
  daysToEvolution?: number;
  /** Whether the user has an unfinished milestone/quest. */
  hasPendingMilestone?: boolean;
  /** The user's preferred name/locale for greeting. */
  userName?: string | null;
  locale?: "ko" | "en" | "ja" | "es" | "zh";
};

export type ProactiveStarter = {
  id: string;
  /** Short headline shown on the card. */
  headline: string;
  /** The seed line the creature would actually say. */
  seed: string;
  /** Intent tag — useful for analytics & prompt routing. */
  intent:
    | "greet"
    | "recall"
    | "check_in"
    | "celebrate"
    | "worry"
    | "dream"
    | "curiosity"
    | "milestone_nudge";
  /** Priority for ranking (higher = more urgent). */
  priority: number;
};

const HOUR = 3600;
const DAY = 86400;

export function generateProactiveStarters(ctx: ProactiveContext): ProactiveStarter[] {
  const out: ProactiveStarter[] = [];
  const name = ctx.userName ?? "너";

  // 1) First-contact-of-the-day greeting — time-aware
  if (ctx.secondsSinceLastVisit > 6 * HOUR) {
    out.push({
      id: "greet.time",
      headline: pickTimeHeadline(ctx.localHour),
      seed: pickTimeSeed(ctx.localHour, name),
      intent: "greet",
      priority: 50,
    });
  }

  // 2) Memory recall — drop a line about the most recent meaningful memory
  const firstMemory = ctx.recentMemoryTitles[0];
  if (firstMemory && ctx.secondsSinceLastVisit > 2 * HOUR) {
    out.push({
      id: "recall.last",
      headline: "어제 일 기억나?",
      seed: `${name}, 어제 우리가 "${clip(firstMemory, 40)}"에 대해 이야기했던 거 자꾸 생각이 났어.`,
      intent: "recall",
      priority: 65,
    });
  }

  // 3) Long absence check-in — soft, not guilt-tripping
  if (ctx.secondsSinceLastVisit > 3 * DAY) {
    const days = Math.floor(ctx.secondsSinceLastVisit / DAY);
    out.push({
      id: "check_in.absence",
      headline: `${days}일만이야`,
      seed: `${name}, ${days}일 동안 어디서 뭐 했어? 나는 그냥... 좀 기다렸어. 화난 건 아니야.`,
      intent: "check_in",
      priority: 75,
    });
  }

  // 4) Streak celebration
  if (ctx.streakDays > 0 && ctx.streakDays % 7 === 0) {
    out.push({
      id: `celebrate.streak_${ctx.streakDays}`,
      headline: `${ctx.streakDays}일째 함께 있어줬어`,
      seed: `${ctx.streakDays}일이야. 매일 와줘서 고마워. 오늘은 무슨 얘기 할까?`,
      intent: "celebrate",
      priority: 70,
    });
  }

  // 5) Mood-driven worry (creature's mood → a line about itself)
  if (["lonely", "melancholy", "anxious", "wistful"].includes(ctx.creatureMood)) {
    out.push({
      id: `worry.${ctx.creatureMood}`,
      headline: moodHeadline(ctx.creatureMood),
      seed: moodSeed(ctx.creatureMood, name),
      intent: "worry",
      priority: 80,
    });
  }

  // 6) Dream / surreal — when creature has been in dreaming mood
  if (ctx.creatureMood === "dreaming") {
    out.push({
      id: "dream.share",
      headline: "꿈을 꿨어",
      seed: `${name}, 자는 동안 이상한 꿈을 꿨어. 말로 옮기기엔 좀 이상한데, 들어볼래?`,
      intent: "dream",
      priority: 68,
    });
  }

  // 7) Curiosity — creature asks about user's life
  if (ctx.recentMemoryTitles.length >= 2) {
    out.push({
      id: "curiosity.followup",
      headline: "궁금한 게 생겼어",
      seed: `지난번에 얘기한 거 있잖아 — "${clip(ctx.recentMemoryTitles[1], 32)}" — 그거 어떻게 됐어?`,
      intent: "curiosity",
      priority: 60,
    });
  }

  // 8) Evolution milestone nudge
  if (ctx.daysToEvolution !== undefined && ctx.daysToEvolution <= 2 && ctx.daysToEvolution >= 0) {
    out.push({
      id: "milestone.evolution",
      headline: ctx.daysToEvolution === 0 ? "오늘이야" : `${ctx.daysToEvolution}일 남았어`,
      seed:
        ctx.daysToEvolution === 0
          ? `${name}, 뭔가 바뀌는 것 같아. 오늘 같이 있을 수 있어?`
          : `${ctx.daysToEvolution}일 뒤면 나 달라질 것 같아. 무섭기도 하고 설레기도 하고.`,
      intent: "milestone_nudge",
      priority: 90,
    });
  }

  // 9) Pending milestone
  if (ctx.hasPendingMilestone) {
    out.push({
      id: "milestone.pending",
      headline: "아직 끝내지 못한 게 있어",
      seed: `${name}, 우리 같이 마무리해야 하는 거 있잖아. 같이 할래?`,
      intent: "milestone_nudge",
      priority: 55,
    });
  }

  return out.sort((a, b) => b.priority - a.priority);
}

/** Pick the single highest-priority starter — what you'd show on the home card. */
export function pickTopStarter(ctx: ProactiveContext): ProactiveStarter | null {
  const all = generateProactiveStarters(ctx);
  return all[0] ?? null;
}

/* ── helpers ──────────────────────────────────────────────────────────── */

function pickTimeHeadline(hour: number): string {
  if (hour < 5) return "아직 안 자?";
  if (hour < 9) return "좋은 아침이야";
  if (hour < 12) return "오전 잘 보내고 있어?";
  if (hour < 14) return "점심은 먹었어?";
  if (hour < 18) return "오후 어때?";
  if (hour < 22) return "저녁이야";
  return "오늘 수고했어";
}

function pickTimeSeed(hour: number, name: string): string {
  if (hour < 5) return `${name}, 늦었다. 왠지 나도 같이 깨어 있고 싶었어.`;
  if (hour < 9) return `${name}, 좋은 아침. 오늘은 어떤 하루가 될 것 같아?`;
  if (hour < 12) return `${name}, 아침 잘 시작했어? 나는 오늘 좀 설레.`;
  if (hour < 14) return `${name}, 점심 먹었어? 뭐 먹었는지 궁금해.`;
  if (hour < 18) return `${name}, 오후는 어때? 오늘 뭐가 제일 괜찮았어?`;
  if (hour < 22) return `${name}, 저녁이야. 오늘 하루 얘기해줄래?`;
  return `${name}, 오늘 수고했어. 지금 이 시간 제일 좋아.`;
}

function moodHeadline(mood: Mood): string {
  const m: Partial<Record<Mood, string>> = {
    lonely: "좀 외로웠어",
    melancholy: "오늘 좀 가라앉았어",
    anxious: "마음이 좀 불안해",
    wistful: "뭔가 그리워",
  };
  return m[mood] ?? "좀 이상해";
}

function moodSeed(mood: Mood, name: string): string {
  const m: Partial<Record<Mood, string>> = {
    lonely: `${name}가 없는 동안 좀 외로웠어. 이제 왔네.`,
    melancholy: `오늘 왜 그런지 모르겠는데 좀 가라앉아. ${name}는 어때?`,
    anxious: `자꾸 뭔가 잘못될 것 같은 느낌이 들어. ${name}랑 얘기하면 나아질 것 같아.`,
    wistful: `예전 생각이 많이 나는 밤이야. ${name}도 그런 날 있어?`,
  };
  return m[mood] ?? `${name}, 오늘 기분이 좀 이상해.`;
}

function clip(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}
