import { describe, expect, it } from "vitest";
import {
  isAgeGroup,
  isMinorAgeGroup,
  canUsePublicSocial,
  readAgeGateCompleted,
  markAgeGateCompleted,
  AGE_GATE_STORAGE_KEY,
} from "./age-gate";

describe("isAgeGroup", () => {
  it("returns true for valid age groups", () => {
    expect(isAgeGroup("under_13")).toBe(true);
    expect(isAgeGroup("teen")).toBe(true);
    expect(isAgeGroup("adult")).toBe(true);
  });

  it("returns false for invalid values", () => {
    expect(isAgeGroup("child")).toBe(false);
    expect(isAgeGroup("")).toBe(false);
    expect(isAgeGroup(null)).toBe(false);
    expect(isAgeGroup(undefined)).toBe(false);
    expect(isAgeGroup(42)).toBe(false);
  });
});

describe("isMinorAgeGroup", () => {
  it("recognizes minor groups", () => {
    expect(isMinorAgeGroup("under_13")).toBe(true);
    expect(isMinorAgeGroup("teen")).toBe(true);
    expect(isMinorAgeGroup("adult")).toBe(false);
  });

  it("handles null and undefined", () => {
    expect(isMinorAgeGroup(null)).toBe(false);
    expect(isMinorAgeGroup(undefined)).toBe(false);
  });
});

describe("canUsePublicSocial", () => {
  it("allows public social only for adults with explicit opt-in", () => {
    expect(canUsePublicSocial({ age_group: "adult", social_public_enabled: true })).toBe(true);
    expect(canUsePublicSocial({ age_group: "teen", social_public_enabled: true })).toBe(false);
    expect(canUsePublicSocial({ age_group: "under_13", social_public_enabled: true })).toBe(false);
    expect(canUsePublicSocial({ age_group: "adult", social_public_enabled: false })).toBe(false);
  });

  it("returns false for null/undefined config", () => {
    expect(canUsePublicSocial(null)).toBe(false);
    expect(canUsePublicSocial(undefined)).toBe(false);
  });

  it("returns false when age_group is missing", () => {
    expect(canUsePublicSocial({ social_public_enabled: true })).toBe(false);
  });

  it("returns false when social_public_enabled is missing", () => {
    expect(canUsePublicSocial({ age_group: "adult" })).toBe(false);
  });
});

describe("readAgeGateCompleted (server-side)", () => {
  it("returns false when window is undefined", () => {
    expect(readAgeGateCompleted()).toBe(false);
  });
});

describe("markAgeGateCompleted (server-side)", () => {
  it("does not throw when window is undefined", () => {
    expect(() => markAgeGateCompleted()).not.toThrow();
  });
});

describe("AGE_GATE_STORAGE_KEY", () => {
  it("is a string constant", () => {
    expect(AGE_GATE_STORAGE_KEY).toBe("gyeol_age_gate_v1");
  });
});
