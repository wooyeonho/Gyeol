/**
 * Notification preferences — client-side settings for opt-in alert categories.
 * Persisted in localStorage; read by the push-notification dispatchers in
 * `lib/retention/personalized-push.ts` and the proactive message flow.
 */

export type NotificationCategory =
  | "streak"      // Streak reminders (flame about to expire)
  | "proactive"   // Creature reaches out on its own
  | "social"      // Follower events, tribe pings, replies
  | "achievement" // Badge unlocks, level-ups, perfect-day
  | "events";     // Seasonal events, wrapped summaries

export interface NotificationPreferences {
  streak: boolean;
  proactive: boolean;
  social: boolean;
  achievement: boolean;
  events: boolean;
  quietHoursEnabled: boolean;
  quietStart: number; // 0-23 inclusive
  quietEnd: number;   // 0-23 inclusive
}

const STORAGE_KEY = "gyeol.notification.preferences.v1";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  streak: true,
  proactive: true,
  social: true,
  achievement: true,
  events: true,
  quietHoursEnabled: false,
  quietStart: 22,
  quietEnd: 8,
};

export function readNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }
}

export function writeNotificationPreferences(prefs: NotificationPreferences): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    // Broadcast so any listeners (push dispatcher) can react.
    window.dispatchEvent(new CustomEvent("gyeol:notification-prefs-changed", { detail: prefs }));
  } catch {
    // ignore
  }
}

export function isCategoryEnabled(category: NotificationCategory): boolean {
  const prefs = readNotificationPreferences();
  return prefs[category];
}

export function isInQuietHours(now: Date = new Date()): boolean {
  const prefs = readNotificationPreferences();
  if (!prefs.quietHoursEnabled) return false;
  const hour = now.getHours();
  const { quietStart: s, quietEnd: e } = prefs;
  if (s === e) return false;
  return s < e ? hour >= s && hour < e : hour >= s || hour < e;
}
