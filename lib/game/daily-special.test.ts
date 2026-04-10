import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getDailySpecialState,
  getTodayChallenge,
  attemptDailyChallenge,
  completeDailyChallenge,
  failDailyChallenge,
  isDailyChallengeAvailable,
  getDailyChallengeStreak,
} from "./daily-special";

const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  },
});
Object.defineProperty(globalThis, "window", { value: globalThis, writable: true });

describe("daily-special", () => {
  beforeEach(() => {
    store.clear();
  });

  it("starts with empty state", () => {
    const state = getDailySpecialState();
    expect(state.currentChallenge).toBeNull();
    expect(state.streak).toBe(0);
  });

  it("getTodayChallenge generates a challenge", () => {
    const challenge = getTodayChallenge();
    expect(challenge.id).toBeTruthy();
    expect(challenge.title.ko).toBeTruthy();
    expect(challenge.title.en).toBeTruthy();
    expect(challenge.attempted).toBe(false);
    expect(challenge.completed).toBe(false);
  });

  it("getTodayChallenge returns same challenge on multiple calls", () => {
    const c1 = getTodayChallenge();
    const c2 = getTodayChallenge();
    expect(c1.id).toBe(c2.id);
  });

  it("isDailyChallengeAvailable returns true initially", () => {
    expect(isDailyChallengeAvailable()).toBe(true);
  });

  it("attemptDailyChallenge marks as attempted", () => {
    getTodayChallenge();
    const challenge = attemptDailyChallenge();
    expect(challenge.attempted).toBe(true);
    expect(isDailyChallengeAvailable()).toBe(false);
  });

  it("completeDailyChallenge returns reward and increments streak", () => {
    getTodayChallenge();
    attemptDailyChallenge();
    const { reward, newStreak } = completeDailyChallenge();
    expect(reward.coins).toBeGreaterThan(0);
    expect(reward.xp).toBeGreaterThan(0);
    expect(newStreak).toBe(1);
  });

  it("failDailyChallenge resets streak", () => {
    getTodayChallenge();
    // First complete a challenge
    completeDailyChallenge();
    expect(getDailyChallengeStreak()).toBe(1);

    // Simulate failure on different day by clearing
    store.clear();
    getTodayChallenge();
    failDailyChallenge();
    expect(getDailyChallengeStreak()).toBe(0);
  });

  it("completeDailyChallenge adds to history", () => {
    getTodayChallenge();
    completeDailyChallenge();
    const state = getDailySpecialState();
    expect(state.history.length).toBe(1);
    expect(state.history[0].completed).toBe(true);
    expect(state.totalCompleted).toBe(1);
  });

  it("challenge reward scales with difficulty", () => {
    const challenge = getTodayChallenge();
    expect(challenge.reward.coins).toBe(challenge.difficulty * 50);
    expect(challenge.reward.xp).toBe(challenge.difficulty * 30);
  });

  it("double complete does not double rewards", () => {
    getTodayChallenge();
    completeDailyChallenge();
    const { reward } = completeDailyChallenge();
    expect(reward.coins).toBe(0);
  });
});
