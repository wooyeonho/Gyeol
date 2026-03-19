import { describe, it, expect } from "vitest";
import {
  checkNewAchievements,
  getAchievement,
  getVisibleAchievements,
  computeAchievementProgress,
  ACHIEVEMENTS,
} from "./achievements";

describe("checkNewAchievements", () => {
  it("unlocks first_words when messages_sent >= 1", () => {
    const newly = checkNewAchievements(
      { total_messages: 1, streak_days: 0, gen_level: 1 },
      [],
    );
    expect(newly).toContain("first_words");
  });

  it("does not re-unlock already unlocked achievements", () => {
    const newly = checkNewAchievements(
      { total_messages: 100, streak_days: 0, gen_level: 1 },
      ["first_words", "chatterbox"],
    );
    expect(newly).not.toContain("first_words");
    expect(newly).not.toContain("chatterbox");
  });

  it("unlocks multiple achievements at once", () => {
    const newly = checkNewAchievements(
      { total_messages: 100, streak_days: 7, gen_level: 2 },
      [],
    );
    expect(newly).toContain("first_words");
    expect(newly).toContain("chatterbox");
    expect(newly).toContain("spark");
    expect(newly).toContain("flame");
    expect(newly).toContain("first_evolution");
  });

  it("unlocks hidden achievements when condition met", () => {
    const newly = checkNewAchievements(
      { total_messages: 5, streak_days: 0, gen_level: 1, actions: ["chat_at_3am"] },
      [],
    );
    expect(newly).toContain("night_owl");
  });

  it("returns empty array when no new achievements", () => {
    const allIds = ACHIEVEMENTS.map((a) => a.id);
    const newly = checkNewAchievements(
      { total_messages: 999999, streak_days: 999, gen_level: 99 },
      allIds,
    );
    expect(newly).toHaveLength(0);
  });
});

describe("getAchievement", () => {
  it("returns achievement by id", () => {
    const a = getAchievement("first_words");
    expect(a).toBeDefined();
    expect(a!.category).toBe("conversation");
  });

  it("returns undefined for non-existent id", () => {
    expect(getAchievement("nonexistent")).toBeUndefined();
  });
});

describe("getVisibleAchievements", () => {
  it("hides hidden achievements not yet unlocked", () => {
    const visible = getVisibleAchievements([]);
    const hiddenIds = ACHIEVEMENTS.filter((a) => a.hidden).map((a) => a.id);
    for (const id of hiddenIds) {
      expect(visible.find((a) => a.id === id)).toBeUndefined();
    }
  });

  it("shows hidden achievements when unlocked", () => {
    const visible = getVisibleAchievements(["night_owl"]);
    expect(visible.find((a) => a.id === "night_owl")).toBeDefined();
  });
});

describe("computeAchievementProgress", () => {
  it("computes correct progress for message-based achievement", () => {
    const a = getAchievement("chatterbox")!;
    const progress = computeAchievementProgress(a, { total_messages: 50 });
    expect(progress.current).toBe(50);
    expect(progress.target).toBe(100);
    expect(progress.percent).toBe(50);
  });

  it("caps at 100%", () => {
    const a = getAchievement("first_words")!;
    const progress = computeAchievementProgress(a, { total_messages: 999 });
    expect(progress.percent).toBe(100);
    expect(progress.current).toBe(1);
  });
});
