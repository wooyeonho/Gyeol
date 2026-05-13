/**
 * Daily care state — persisted in localStorage by date key.
 *
 * Key format: "gyeol_daily_care:2026-05-13"
 * A new key is created automatically each day, so yesterday's state is
 * implicitly archived without any cleanup logic.
 *
 * Future: sync to server as part of engagement snapshot:
 *   sentMessageToday, petCountToday, careCompletedToday, lastCareDate
 */

const PREFIX = "gyeol_daily_care";

export type DailyCareState = {
  petCountToday: number;
  touchedAt: string | null;
  careCompleted: boolean;
};

const EMPTY: DailyCareState = { petCountToday: 0, touchedAt: null, careCompleted: false };

function todayKey(): string {
  return `${PREFIX}:${new Date().toISOString().slice(0, 10)}`;
}

export function loadDailyCare(): DailyCareState {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = localStorage.getItem(todayKey());
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<DailyCareState>) };
  } catch {
    return { ...EMPTY };
  }
}

export function saveDailyCare(patch: Partial<DailyCareState>): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadDailyCare();
    localStorage.setItem(todayKey(), JSON.stringify({ ...current, ...patch }));
  } catch {
    // localStorage may be full or unavailable in private browsing
  }
}

/** Atomically increments petCountToday and returns the new count. */
export function incrementPetCount(): number {
  const current = loadDailyCare();
  const next = current.petCountToday + 1;
  saveDailyCare({ petCountToday: next, touchedAt: new Date().toISOString() });
  return next;
}
