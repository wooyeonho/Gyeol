import { describe, it, expect } from "vitest";
import { readLocalMissions, writeLocalMissions, LOCAL_MISSION_STORAGE_KEY } from "./local-missions";

describe("readLocalMissions (server-side)", () => {
  it("returns empty array when window is undefined", () => {
    expect(readLocalMissions()).toEqual([]);
  });
});

describe("writeLocalMissions (server-side)", () => {
  it("does not throw when window is undefined", () => {
    expect(() => writeLocalMissions([{ id: "1", title: "test", done: false }])).not.toThrow();
  });
});

describe("LOCAL_MISSION_STORAGE_KEY", () => {
  it("is a string constant", () => {
    expect(LOCAL_MISSION_STORAGE_KEY).toBe("gyeol-worldclass-missions-v1");
  });
});
