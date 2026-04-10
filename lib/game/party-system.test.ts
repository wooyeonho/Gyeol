import { describe, expect, it } from "vitest";
import {
  PARTY_MAX_SIZE,
  calculatePartySynergy,
  getPartyPower,
  canAddToParty,
  getActiveCreature,
  switchActiveCreature,
} from "./party-system";
import type { PartyMember } from "./party-system";
import type { DominantType } from "@/lib/game/type-advantage";
import type { CreatureStats } from "@/lib/game/stat-system";

const makeStats = (base: number = 50): CreatureStats => ({
  hp: base,
  atk: base,
  def: base,
  spd: base,
  wis: base,
  cha: base,
});

const makeMember = (overrides: Partial<PartyMember> & { creatureId: string }): PartyMember => ({
  name: "Test Creature",
  dominantType: "balanced",
  level: 5,
  stats: makeStats(),
  isActive: false,
  ...overrides,
});

describe("party-system", () => {
  it("PARTY_MAX_SIZE is 6", () => {
    expect(PARTY_MAX_SIZE).toBe(6);
  });

  it("canAddToParty returns true when party has fewer than 6 members", () => {
    const party = [makeMember({ creatureId: "a" })];
    expect(canAddToParty(party)).toBe(true);
  });

  it("canAddToParty returns false when party is full", () => {
    const party = Array.from({ length: 6 }, (_, i) =>
      makeMember({ creatureId: `c${i}` }),
    );
    expect(canAddToParty(party)).toBe(false);
  });

  it("canAddToParty returns true for empty party", () => {
    expect(canAddToParty([])).toBe(true);
  });

  it("getActiveCreature returns the active member", () => {
    const party = [
      makeMember({ creatureId: "a", isActive: false }),
      makeMember({ creatureId: "b", isActive: true, name: "Active One" }),
    ];
    const active = getActiveCreature(party);
    expect(active).not.toBeNull();
    expect(active!.creatureId).toBe("b");
    expect(active!.name).toBe("Active One");
  });

  it("getActiveCreature returns null when no creature is active", () => {
    const party = [
      makeMember({ creatureId: "a", isActive: false }),
      makeMember({ creatureId: "b", isActive: false }),
    ];
    expect(getActiveCreature(party)).toBeNull();
  });

  it("switchActiveCreature sets the correct creature as active", () => {
    const party = [
      makeMember({ creatureId: "a", isActive: true }),
      makeMember({ creatureId: "b", isActive: false }),
      makeMember({ creatureId: "c", isActive: false }),
    ];
    const updated = switchActiveCreature(party, "c");
    expect(updated.find((m) => m.creatureId === "c")!.isActive).toBe(true);
    expect(updated.find((m) => m.creatureId === "a")!.isActive).toBe(false);
    expect(updated.find((m) => m.creatureId === "b")!.isActive).toBe(false);
  });

  it("switchActiveCreature returns unchanged party for unknown creatureId", () => {
    const party = [
      makeMember({ creatureId: "a", isActive: true }),
    ];
    const updated = switchActiveCreature(party, "nonexistent");
    expect(updated).toEqual(party);
  });

  it("getPartyPower sums all members' stats", () => {
    const party = [
      makeMember({ creatureId: "a", stats: makeStats(10) }),
      makeMember({ creatureId: "b", stats: makeStats(20) }),
    ];
    // member a: 6 * 10 = 60, member b: 6 * 20 = 120
    expect(getPartyPower(party)).toBe(180);
  });

  it("getPartyPower returns 0 for empty party", () => {
    expect(getPartyPower([])).toBe(0);
  });

  it("calculatePartySynergy returns empty for empty party", () => {
    expect(calculatePartySynergy([])).toEqual([]);
  });

  it("calculatePartySynergy grants Rainbow Synergy when all 5 types present", () => {
    const types: DominantType[] = ["analytical", "emotional", "social", "creative", "balanced"];
    const party = types.map((type, i) =>
      makeMember({ creatureId: `c${i}`, dominantType: type }),
    );
    const bonuses = calculatePartySynergy(party);
    const rainbow = bonuses.find((b) => b.name.en === "Rainbow Synergy");
    expect(rainbow).toBeDefined();
    expect(rainbow!.bonusPercent).toBe(10);
    expect(rainbow!.bonusType).toBe("allStats");
  });

  it("calculatePartySynergy does not grant Rainbow Synergy with fewer than 5 types", () => {
    const party = [
      makeMember({ creatureId: "a", dominantType: "analytical" }),
      makeMember({ creatureId: "b", dominantType: "emotional" }),
      makeMember({ creatureId: "c", dominantType: "social" }),
      makeMember({ creatureId: "d", dominantType: "creative" }),
    ];
    const bonuses = calculatePartySynergy(party);
    const rainbow = bonuses.find((b) => b.name.en === "Rainbow Synergy");
    expect(rainbow).toBeUndefined();
  });

  it("calculatePartySynergy grants Type Focus for 2+ same type", () => {
    const party = [
      makeMember({ creatureId: "a", dominantType: "analytical" }),
      makeMember({ creatureId: "b", dominantType: "analytical" }),
      makeMember({ creatureId: "c", dominantType: "emotional" }),
    ];
    const bonuses = calculatePartySynergy(party);
    const focus = bonuses.find((b) => b.name.en === "Type Focus");
    expect(focus).toBeDefined();
    expect(focus!.bonusPercent).toBe(15);
    expect(focus!.bonusType).toBe("atk"); // analytical primary stat
  });

  it("calculatePartySynergy grants multiple Type Focus bonuses for multiple duplicated types", () => {
    const party = [
      makeMember({ creatureId: "a", dominantType: "analytical" }),
      makeMember({ creatureId: "b", dominantType: "analytical" }),
      makeMember({ creatureId: "c", dominantType: "creative" }),
      makeMember({ creatureId: "d", dominantType: "creative" }),
    ];
    const bonuses = calculatePartySynergy(party);
    const focuses = bonuses.filter((b) => b.name.en === "Type Focus");
    expect(focuses).toHaveLength(2);
    const statTypes = focuses.map((f) => f.bonusType).sort();
    expect(statTypes).toEqual(["atk", "spd"]); // analytical→atk, creative→spd
  });

  it("calculatePartySynergy grants Bonded Team for high average affinity", () => {
    const party = [
      makeMember({ creatureId: "a", affinity: 0.8 }),
      makeMember({ creatureId: "b", affinity: 0.9 }),
      makeMember({ creatureId: "c", affinity: 0.7 }),
    ];
    const bonuses = calculatePartySynergy(party);
    const bonded = bonuses.find((b) => b.name.en === "Bonded Team");
    expect(bonded).toBeDefined();
    expect(bonded!.bonusPercent).toBe(5);
    expect(bonded!.bonusType).toBe("xp");
  });

  it("calculatePartySynergy does not grant Bonded Team for low affinity", () => {
    const party = [
      makeMember({ creatureId: "a", affinity: 0.3 }),
      makeMember({ creatureId: "b", affinity: 0.4 }),
    ];
    const bonuses = calculatePartySynergy(party);
    const bonded = bonuses.find((b) => b.name.en === "Bonded Team");
    expect(bonded).toBeUndefined();
  });

  it("calculatePartySynergy can grant Rainbow Synergy and Bonded Team together", () => {
    const types: DominantType[] = ["analytical", "emotional", "social", "creative", "balanced"];
    const party = types.map((type, i) =>
      makeMember({ creatureId: `c${i}`, dominantType: type, affinity: 0.9 }),
    );
    const bonuses = calculatePartySynergy(party);
    expect(bonuses.find((b) => b.name.en === "Rainbow Synergy")).toBeDefined();
    expect(bonuses.find((b) => b.name.en === "Bonded Team")).toBeDefined();
  });

  it("switchActiveCreature does not mutate the original array", () => {
    const party = [
      makeMember({ creatureId: "a", isActive: true }),
      makeMember({ creatureId: "b", isActive: false }),
    ];
    const updated = switchActiveCreature(party, "b");
    // Original should be unchanged
    expect(party[0].isActive).toBe(true);
    expect(party[1].isActive).toBe(false);
    // Updated should reflect the switch
    expect(updated[0].isActive).toBe(false);
    expect(updated[1].isActive).toBe(true);
  });
});
