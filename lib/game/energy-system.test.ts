import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getEnergyState,
  consumeEnergy,
  addBonusEnergy,
  refillEnergy,
  getTimeToNextRegen,
  hasEnergy,
  increaseMaxEnergy,
} from "./energy-system";

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

describe("energy-system", () => {
  beforeEach(() => {
    store.clear();
  });

  it("starts with full energy (20)", () => {
    const state = getEnergyState();
    expect(state.current).toBe(20);
    expect(state.max).toBe(20);
  });

  it("consumeEnergy reduces current energy", () => {
    getEnergyState(); // Initialize
    const success = consumeEnergy(3);
    expect(success).toBe(true);
    expect(getEnergyState().current).toBe(17);
  });

  it("consumeEnergy fails when not enough energy", () => {
    getEnergyState();
    // Drain energy
    for (let i = 0; i < 20; i++) consumeEnergy(1);
    const success = consumeEnergy(1);
    expect(success).toBe(false);
  });

  it("addBonusEnergy adds bonus", () => {
    getEnergyState();
    addBonusEnergy(5);
    expect(getEnergyState().bonusEnergy).toBe(5);
  });

  it("consumeEnergy uses bonus energy first", () => {
    getEnergyState();
    addBonusEnergy(3);
    consumeEnergy(2);
    const state = getEnergyState();
    expect(state.bonusEnergy).toBe(1);
    expect(state.current).toBe(20); // Regular energy untouched
  });

  it("consumeEnergy uses regular energy after bonus depleted", () => {
    getEnergyState();
    addBonusEnergy(1);
    consumeEnergy(3); // 1 from bonus, 2 from regular
    const state = getEnergyState();
    expect(state.bonusEnergy).toBe(0);
    expect(state.current).toBe(18);
  });

  it("refillEnergy restores to max", () => {
    getEnergyState();
    consumeEnergy(10);
    refillEnergy();
    expect(getEnergyState().current).toBe(20);
  });

  it("getTimeToNextRegen returns null at full energy", () => {
    getEnergyState();
    expect(getTimeToNextRegen()).toBeNull();
  });

  it("getTimeToNextRegen returns time when not full", () => {
    getEnergyState();
    consumeEnergy(1);
    const time = getTimeToNextRegen();
    expect(time).not.toBeNull();
    expect(time!.minutes).toBeGreaterThanOrEqual(0);
  });

  it("hasEnergy checks correctly", () => {
    getEnergyState();
    expect(hasEnergy(20)).toBe(true);
    expect(hasEnergy(21)).toBe(false);
  });

  it("hasEnergy includes bonus energy", () => {
    getEnergyState();
    addBonusEnergy(5);
    expect(hasEnergy(25)).toBe(true);
    expect(hasEnergy(26)).toBe(false);
  });

  it("increaseMaxEnergy increases both max and current", () => {
    getEnergyState();
    increaseMaxEnergy(5);
    const state = getEnergyState();
    expect(state.max).toBe(25);
    expect(state.current).toBe(25);
  });
});
