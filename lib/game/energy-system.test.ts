import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getEnergy,
  useEnergy as consumeEnergy,
  regenerateEnergy,
  receiveGift,
  canUseFeature,
  sendEnergyGift,
  claimEnergyGift,
  MAX_ENERGY,
  REGEN_INTERVAL_MS,
} from "./energy-system";

// ---------------------------------------------------------------------------
// Mock localStorage
// ---------------------------------------------------------------------------

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

  // ── getEnergy ──────────────────────────────────────────────────────────

  it("starts with 5 energy (MAX_ENERGY)", () => {
    const state = getEnergy();
    expect(state.current).toBe(5);
    expect(state.max).toBe(MAX_ENERGY);
  });

  it("returns current state without mutation when full", () => {
    const a = getEnergy();
    const b = getEnergy();
    expect(a.current).toBe(b.current);
  });

  // ── useEnergy ──────────────────────────────────────────────────────────

  it("useEnergy reduces current energy by 1", () => {
    getEnergy(); // Initialize
    const success = consumeEnergy();
    expect(success).toBe(true);
    expect(getEnergy().current).toBe(4);
  });

  it("useEnergy fails when energy is 0", () => {
    getEnergy();
    for (let i = 0; i < MAX_ENERGY; i++) consumeEnergy();
    expect(consumeEnergy()).toBe(false);
    expect(getEnergy().current).toBe(0);
  });

  // ── regenerateEnergy ───────────────────────────────────────────────────

  it("regenerates 1 energy after 4 hours", () => {
    getEnergy();
    // Drain all energy
    for (let i = 0; i < MAX_ENERGY; i++) consumeEnergy();
    expect(getEnergy().current).toBe(0);

    // Simulate 4 hours passing
    const fourHoursLater = new Date(Date.now() + REGEN_INTERVAL_MS);
    const state = regenerateEnergy(fourHoursLater);
    expect(state.current).toBe(1);
  });

  it("regenerates multiple points after multiple intervals", () => {
    getEnergy();
    for (let i = 0; i < MAX_ENERGY; i++) consumeEnergy();

    const eightHoursLater = new Date(Date.now() + 2 * REGEN_INTERVAL_MS);
    const state = regenerateEnergy(eightHoursLater);
    expect(state.current).toBe(2);
  });

  it("does not regenerate above max", () => {
    getEnergy();
    consumeEnergy(); // 4/5

    const dayLater = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const state = regenerateEnergy(dayLater);
    expect(state.current).toBe(MAX_ENERGY);
  });

  // ── canUseFeature ──────────────────────────────────────────────────────

  it("canUseFeature returns true when energy is available", () => {
    getEnergy();
    expect(canUseFeature("dungeon_exploration")).toBe(true);
    expect(canUseFeature("special_challenge")).toBe(true);
  });

  it("canUseFeature returns false when energy is 0", () => {
    getEnergy();
    for (let i = 0; i < MAX_ENERGY; i++) consumeEnergy();
    expect(canUseFeature("dungeon_exploration")).toBe(false);
  });

  // ── sendEnergyGift ─────────────────────────────────────────────────────

  it("sendEnergyGift creates a gift object", () => {
    const gift = sendEnergyGift("friend-1");
    expect(gift).not.toBeNull();
    expect(gift!.fromFriendId).toBe("friend-1");
    expect(gift!.claimed).toBe(false);
  });

  it("sendEnergyGift allows up to 3 gifts per friend per day", () => {
    expect(sendEnergyGift("friend-1")).not.toBeNull();
    expect(sendEnergyGift("friend-1")).not.toBeNull();
    expect(sendEnergyGift("friend-1")).not.toBeNull();
    expect(sendEnergyGift("friend-1")).toBeNull(); // 4th should fail
  });

  it("sendEnergyGift tracks limits per friend independently", () => {
    for (let i = 0; i < 3; i++) sendEnergyGift("friend-a");
    expect(sendEnergyGift("friend-a")).toBeNull();
    expect(sendEnergyGift("friend-b")).not.toBeNull(); // different friend OK
  });

  // ── claimEnergyGift ────────────────────────────────────────────────────

  it("claimEnergyGift adds 1 energy and marks gift as claimed", () => {
    getEnergy();
    for (let i = 0; i < MAX_ENERGY; i++) consumeEnergy();
    expect(getEnergy().current).toBe(0);

    const gift = sendEnergyGift("friend-1");
    expect(gift).not.toBeNull();

    const claimed = claimEnergyGift(gift!.id);
    expect(claimed).toBe(true);
    expect(getEnergy().current).toBe(1);
  });

  it("claimEnergyGift rejects already-claimed gifts", () => {
    getEnergy();
    const gift = sendEnergyGift("friend-1");
    claimEnergyGift(gift!.id);
    expect(claimEnergyGift(gift!.id)).toBe(false);
  });

  it("claimEnergyGift enforces 10-per-day receive limit", () => {
    getEnergy();
    for (let i = 0; i < MAX_ENERGY; i++) consumeEnergy();

    // Send 12 gifts from different friends
    const gifts: string[] = [];
    for (let i = 0; i < 12; i++) {
      const g = sendEnergyGift(`friend-${i}`);
      if (g) gifts.push(g.id);
    }

    // Claim up to 10
    let claimedCount = 0;
    for (const id of gifts) {
      if (claimEnergyGift(id)) claimedCount++;
    }
    expect(claimedCount).toBe(10);
  });

  // ── receiveGift ────────────────────────────────────────────────────────

  it("receiveGift claims the first unclaimed gift", () => {
    getEnergy();
    for (let i = 0; i < MAX_ENERGY; i++) consumeEnergy();
    sendEnergyGift("friend-1");

    expect(receiveGift()).toBe(true);
    expect(getEnergy().current).toBe(1);
  });

  it("receiveGift returns false when no pending gifts", () => {
    getEnergy();
    expect(receiveGift()).toBe(false);
  });
});
