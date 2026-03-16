const LAST_VISIT_KEY = "gyeol-last-visit-ts";
const COMEBACK_SHOWN_KEY = "gyeol-comeback-shown";
const COMEBACK_THRESHOLD_DAYS = 3;

export type ComebackReward = {
  daysAway: number;
  coins: number;
  message: Record<string, string>;
  streakFreeze: boolean;
};

export function checkComebackReward(): ComebackReward | null {
  if (typeof window === "undefined") return null;

  try {
    const lastVisit = window.localStorage.getItem(LAST_VISIT_KEY);
    const comebackShown = window.localStorage.getItem(COMEBACK_SHOWN_KEY);
    const now = Date.now();

    // Update last visit
    window.localStorage.setItem(LAST_VISIT_KEY, String(now));

    if (!lastVisit) return null;

    const daysSinceLastVisit = Math.floor((now - Number(lastVisit)) / (1000 * 60 * 60 * 24));

    if (daysSinceLastVisit < COMEBACK_THRESHOLD_DAYS) return null;

    // Don't show twice for same absence
    if (comebackShown === lastVisit) return null;
    window.localStorage.setItem(COMEBACK_SHOWN_KEY, lastVisit);

    const coins = Math.min(daysSinceLastVisit * 10, 100);

    return {
      daysAway: daysSinceLastVisit,
      coins,
      message: {
        ko: `${daysSinceLastVisit}일 만이에요! 결이 기다리고 있었어요.`,
        en: `${daysSinceLastVisit} days! Gyeol has been waiting for you.`,
      },
      streakFreeze: daysSinceLastVisit <= 7,
    };
  } catch {
    return null;
  }
}
