import { describe, expect, it } from "vitest";
import { chooseControlledAutonomousIntent } from "./autonomy-engine";
import { createInitialCreatureState } from "./initial-state";
import { creatureReducer } from "./reducer";

const NOW = "2026-05-14T00:00:00.000Z";

describe("creature life reducer", () => {
  it("creates bounded initial drives and dna", () => {
    const state = createInitialCreatureState("test", new Date(NOW));
    for (const value of Object.values(state.drives)) expect(value).toBeGreaterThanOrEqual(0);
    for (const value of Object.values(state.drives)) expect(value).toBeLessThanOrEqual(100);
    for (const value of Object.values(state.dna)) expect(value).toBeGreaterThanOrEqual(0);
    for (const value of Object.values(state.dna)) expect(value).toBeLessThanOrEqual(1);
  });

  it("applies time decay when the creator returns", () => {
    const state = createInitialCreatureState("test", new Date(NOW));
    const next = creatureReducer(state, { type: "USER_RETURNED", elapsedMinutes: 120, at: "2026-05-14T02:00:00.000Z" });
    expect(next.ageMinutes).toBe(120);
    expect(next.drives.hunger).toBeGreaterThan(state.drives.hunger);
    expect(next.drives.stability).toBeLessThan(state.drives.stability);
  });

  it("message input satisfies hunger and increases curiosity", () => {
    const state = createInitialCreatureState("test", new Date(NOW));
    const next = creatureReducer(state, { type: "MESSAGE_SENT", textLength: 120, at: NOW });
    expect(next.drives.hunger).toBeLessThan(state.drives.hunger);
    expect(next.drives.curiosity).toBeGreaterThan(state.drives.curiosity);
  });

  it("touch stabilizes attachment", () => {
    const state = createInitialCreatureState("test", new Date(NOW));
    const next = creatureReducer(state, { type: "TOUCHED", intensity: "long", at: NOW });
    expect(next.drives.stability).toBeGreaterThan(state.drives.stability);
    expect(next.drives.attachment).toBeGreaterThan(state.drives.attachment);
  });

  it("money mission changes ambition and money instinct", () => {
    const state = createInitialCreatureState("test", new Date(NOW));
    const next = creatureReducer(state, { type: "MISSION_COMPLETED", category: "money", at: NOW });
    expect(next.drives.ambition).toBeGreaterThan(state.drives.ambition);
    expect(next.dna.moneyInstinct).toBeGreaterThan(state.dna.moneyInstinct);
  });

  it("control policy can pause autonomous action", () => {
    const state = createInitialCreatureState("test", new Date(NOW));
    const hungry = { ...state, drives: { ...state.drives, hunger: 95 } };
    expect(chooseControlledAutonomousIntent(hungry)).toBe("ASK_FOR_INPUT");
    const paused = creatureReducer(hungry, { type: "CREATURE_PAUSED", paused: true, at: NOW });
    expect(chooseControlledAutonomousIntent(paused)).toBeNull();
  });
});
