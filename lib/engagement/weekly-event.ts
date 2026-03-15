import type { Locale } from "@/lib/i18n/config";

export type WeeklyEventState = {
  weekKey: string;
  messageCount: number;
  completed: boolean;
  claimedAt: string | null;
};

export type WeeklyEventProgress = {
  target: number;
  progress: number;
  remaining: number;
  completed: boolean;
  weekKey: string;
  endsAt: string;
};

const WEEKLY_EVENT_STORAGE_KEY = "gyeol_weekly_event_progress_v1";
export const WEEKLY_EVENT_TARGET = 10;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function getWeeklyEventWeekKey(date = new Date()) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${pad(weekNo)}`;
}

export function getWeeklyEventEnd(date = new Date()) {
  const end = new Date(date);
  const day = end.getDay();
  const diffToSunday = (7 - day) % 7;
  end.setDate(end.getDate() + diffToSunday);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function createEmptyWeeklyEventState(date = new Date()): WeeklyEventState {
  return {
    weekKey: getWeeklyEventWeekKey(date),
    messageCount: 0,
    completed: false,
    claimedAt: null,
  };
}

export function normalizeWeeklyEventState(
  value: Partial<WeeklyEventState> | null | undefined,
  date = new Date(),
): WeeklyEventState {
  const empty = createEmptyWeeklyEventState(date);
  if (!value) return empty;
  if (value.weekKey !== empty.weekKey) return empty;

  return {
    weekKey: empty.weekKey,
    messageCount: typeof value.messageCount === "number" ? Math.max(0, value.messageCount) : 0,
    completed: value.completed === true,
    claimedAt: typeof value.claimedAt === "string" ? value.claimedAt : null,
  };
}

export function getWeeklyEventProgress(
  state: WeeklyEventState,
  date = new Date(),
): WeeklyEventProgress {
  const normalized = normalizeWeeklyEventState(state, date);
  const progress = Math.min(WEEKLY_EVENT_TARGET, normalized.messageCount);

  return {
    target: WEEKLY_EVENT_TARGET,
    progress,
    remaining: Math.max(0, WEEKLY_EVENT_TARGET - progress),
    completed: normalized.completed,
    weekKey: normalized.weekKey,
    endsAt: getWeeklyEventEnd(date).toISOString(),
  };
}

export function registerWeeklyEventMessage(
  current: WeeklyEventState,
  date = new Date(),
): { state: WeeklyEventState; completedNow: boolean } {
  const normalized = normalizeWeeklyEventState(current, date);
  const nextCount = normalized.messageCount + 1;
  const completedNow = !normalized.completed && nextCount >= WEEKLY_EVENT_TARGET;

  return {
    state: {
      ...normalized,
      messageCount: nextCount,
      completed: normalized.completed || completedNow,
      claimedAt: completedNow ? date.toISOString() : normalized.claimedAt,
    },
    completedNow,
  };
}

function readStorageString(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageString(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures in restricted environments.
  }
}

export function readWeeklyEventState(date = new Date()) {
  const raw = readStorageString(WEEKLY_EVENT_STORAGE_KEY);
  if (!raw) return createEmptyWeeklyEventState(date);

  try {
    return normalizeWeeklyEventState(JSON.parse(raw) as Partial<WeeklyEventState>, date);
  } catch {
    return createEmptyWeeklyEventState(date);
  }
}

export function writeWeeklyEventState(state: WeeklyEventState) {
  writeStorageString(WEEKLY_EVENT_STORAGE_KEY, JSON.stringify(state));
}

export function formatWeeklyEventCountdown(
  locale: Locale,
  endsAt: string,
  now = new Date(),
) {
  const diff = Math.max(0, new Date(endsAt).getTime() - now.getTime());
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (locale === "en") {
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h ${minutes}m left`;
  }

  if (days > 0) return `${days}일 ${hours}시간 남음`;
  return `${hours}시간 ${minutes}분 남음`;
}
