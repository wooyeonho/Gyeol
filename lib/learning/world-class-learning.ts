/**
 * World-class learning patterns — synthesized from 12+ top learning apps.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.9):
 *   Duolingo, Khan Academy, Khanmigo, Anki, Quizlet, Brilliant, Coursera,
 *   MasterClass, Readwise, Obsidian, Memrise, Busuu.
 *
 * Delivers the core primitives: spaced-repetition scheduling (SM-2 lite),
 * streak + streak-freeze bookkeeping, mastery progression, and a Socratic
 * conversation stage machine.
 */

export type LearningPrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const LEARNING_PRINCIPLES: readonly LearningPrinciple[] = [
  {
    id: "streak-and-freeze",
    source: "Duolingo",
    rule: "Streaks are sacred; freezes absorb one miss so users don't rage-quit.",
  },
  {
    id: "mastery-tree",
    source: "Khan Academy",
    rule: "Skills unlock as a tree; mastery is earned, not completion-measured.",
  },
  {
    id: "socratic-coach",
    source: "Khanmigo",
    rule: "AI tutors ask questions rather than answering directly.",
  },
  {
    id: "spaced-repetition",
    source: "Anki",
    rule: "Cards resurface at intervals tuned per-card based on recall quality.",
  },
  {
    id: "flashcard",
    source: "Quizlet",
    rule: "Cards flip with a 150ms fast animation; back is always readable in one glance.",
  },
  {
    id: "interactive-problem",
    source: "Brilliant",
    rule: "Math/science problems are interactive widgets, not static images.",
  },
  {
    id: "certificate",
    source: "Coursera",
    rule: "Courses issue verifiable certificates tied to a public profile.",
  },
  {
    id: "persona-curation",
    source: "MasterClass",
    rule: "Instruction is curated around a named expert, not a faceless course.",
  },
  {
    id: "highlight-recall",
    source: "Readwise",
    rule: "Passive highlights become active recall items over time.",
  },
  {
    id: "knowledge-graph",
    source: "Obsidian",
    rule: "Notes have backlinks; navigating the graph is a primary UI.",
  },
  {
    id: "native-video",
    source: "Memrise",
    rule: "Real-world video of native speakers beats synthesized audio for language.",
  },
  {
    id: "peer-correction",
    source: "Busuu",
    rule: "Peer corrections from native speakers augment automated grading.",
  },
] as const;

/* ── Spaced repetition (SM-2 lite) ───────────────────────────────────── */

export type SrsCard = {
  id: string;
  intervalDays: number;
  ease: number; // 1.3 .. 2.5
  repetitions: number;
  dueAt: number; // unix ms
};

export type RecallQuality = 0 | 1 | 2 | 3 | 4 | 5;

/** Advance an SRS card after a review. SM-2-like formula, clamped ease. */
export function reviewCard(card: SrsCard, quality: RecallQuality, now: number): SrsCard {
  const passed = quality >= 3;
  let intervalDays: number;
  let repetitions: number;
  if (!passed) {
    repetitions = 0;
    intervalDays = 1;
  } else {
    repetitions = card.repetitions + 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(card.intervalDays * card.ease);
  }
  const ease = Math.max(
    1.3,
    card.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );
  return {
    ...card,
    intervalDays,
    ease,
    repetitions,
    dueAt: now + intervalDays * 24 * 3600 * 1000,
  };
}

export function dueNow(cards: readonly SrsCard[], now: number): SrsCard[] {
  return cards.filter((c) => c.dueAt <= now);
}

/* ── Streak w/ freeze ────────────────────────────────────────────────── */

export type StreakState = {
  count: number;
  freezes: number;
  lastActivityDay: number; // day index (epoch days)
};

export function updateStreakWithFreeze(
  state: StreakState,
  todayDay: number,
): StreakState {
  const gap = todayDay - state.lastActivityDay;
  if (gap === 0) return state;
  if (gap === 1) {
    return { ...state, count: state.count + 1, lastActivityDay: todayDay };
  }
  // Missed days: consume freezes before breaking the streak.
  const missed = gap - 1;
  if (state.freezes >= missed) {
    return {
      ...state,
      count: state.count + 1,
      freezes: state.freezes - missed,
      lastActivityDay: todayDay,
    };
  }
  return { count: 1, freezes: state.freezes, lastActivityDay: todayDay };
}

/* ── Mastery progression ────────────────────────────────────────────── */

export type SkillNode = {
  id: string;
  prerequisites: readonly string[];
  mastery: number; // 0..1
};

export function isUnlocked(
  skill: SkillNode,
  graph: readonly SkillNode[],
  threshold = 0.8,
): boolean {
  if (skill.prerequisites.length === 0) return true;
  const byId = new Map(graph.map((n) => [n.id, n]));
  return skill.prerequisites.every((pid) => (byId.get(pid)?.mastery ?? 0) >= threshold);
}

/* ── Socratic coach state machine ────────────────────────────────────── */

export type SocraticState = "observe" | "ask" | "probe" | "reframe" | "confirm";

export function nextSocraticState(current: SocraticState, userCertain: boolean): SocraticState {
  if (userCertain && current === "confirm") return "observe";
  switch (current) {
    case "observe":
      return "ask";
    case "ask":
      return userCertain ? "confirm" : "probe";
    case "probe":
      return "reframe";
    case "reframe":
      return "ask";
    case "confirm":
      return "observe";
  }
}
