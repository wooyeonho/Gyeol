/**
 * Perfect Day Streak — consecutive days where ALL daily challenges are completed.
 * Separate from regular streak (which just requires any activity).
 *
 * Tracks: perfectDayCount, longestPerfectStreak, currentPerfectStreak
 * Awards special badge at 3, 7, 14, 30 consecutive perfect days.
 */

const PERFECT_DAY_KEY = "gyeol_perfect_day_v1";

export interface PerfectDayData {
  /** Total number of perfect days ever recorded. */
  total: number;
  /** Current consecutive perfect-day streak. */
  current: number;
  /** Longest consecutive perfect-day streak ever achieved. */
  longest: number;
  /** ISO date string (YYYY-MM-DD) of the last recorded perfect day. */
  lastPerfectDate: string | null;
}

const DEFAULT_DATA: PerfectDayData = {
  total: 0,
  current: 0,
  longest: 0,
  lastPerfectDate: null,
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readData(): PerfectDayData {
  if (!isBrowser()) return { ...DEFAULT_DATA };
  try {
    const raw = window.localStorage.getItem(PERFECT_DAY_KEY);
    if (!raw) return { ...DEFAULT_DATA };
    return JSON.parse(raw) as PerfectDayData;
  } catch {
    return { ...DEFAULT_DATA };
  }
}

function writeData(data: PerfectDayData): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PERFECT_DAY_KEY, JSON.stringify(data));
  } catch {
    // Ignore localStorage write errors.
  }
}

/**
 * Get today's date string in YYYY-MM-DD format.
 */
export function todayDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Check whether the day qualifies as a "perfect day":
 * all daily challenges must be completed.
 */
export function checkPerfectDay(
  completedChallenges: number,
  totalChallenges: number,
): boolean {
  return totalChallenges > 0 && completedChallenges >= totalChallenges;
}

/**
 * Determine whether two ISO date strings represent consecutive calendar days.
 */
export function isConsecutiveDay(prev: string, current: string): boolean {
  const prevDate = new Date(prev + "T00:00:00Z");
  const currentDate = new Date(current + "T00:00:00Z");
  const diffMs = currentDate.getTime() - prevDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays === 1;
}

/**
 * Record a perfect day. Should be called once per day when all challenges
 * are confirmed completed. Idempotent for the same calendar day.
 */
export function recordPerfectDay(now = new Date()): void {
  const today = todayDateString(now);
  const data = readData();

  // Idempotent: don't double-count if already recorded today
  if (data.lastPerfectDate === today) return;

  // Determine if this extends the current streak
  const isConsecutive =
    data.lastPerfectDate !== null && isConsecutiveDay(data.lastPerfectDate, today);

  const newCurrent = isConsecutive ? data.current + 1 : 1;
  const newLongest = Math.max(data.longest, newCurrent);

  const updated: PerfectDayData = {
    total: data.total + 1,
    current: newCurrent,
    longest: newLongest,
    lastPerfectDate: today,
  };

  writeData(updated);
}

/**
 * Get the current perfect day streak information.
 */
export function getPerfectDayStreak(now = new Date()): {
  current: number;
  longest: number;
  total: number;
} {
  const data = readData();
  const today = todayDateString(now);

  // If the last perfect day was not today or yesterday, the current streak is broken
  let current = data.current;
  if (data.lastPerfectDate !== null) {
    const isToday = data.lastPerfectDate === today;
    const isYesterday = isConsecutiveDay(data.lastPerfectDate, today);
    if (!isToday && !isYesterday) {
      current = 0;
    }
  }

  return {
    current,
    longest: data.longest,
    total: data.total,
  };
}

/**
 * Perfect day streak milestones that unlock special achievements.
 */
export const PERFECT_DAY_MILESTONES = [3, 7, 14, 30] as const;

/**
 * Check which perfect-day milestone badges should be awarded
 * based on the current streak.
 */
export function getEarnedPerfectDayMilestones(currentStreak: number): number[] {
  return PERFECT_DAY_MILESTONES.filter((m) => currentStreak >= m);
}
