import { describe, expect, it } from "vitest";
import { canUsePublicSocial, isMinorAgeGroup } from "./age-gate";

describe("age gate safety helpers", () => {
  it("recognizes minor groups", () => {
    expect(isMinorAgeGroup("under_13")).toBe(true);
    expect(isMinorAgeGroup("teen")).toBe(true);
    expect(isMinorAgeGroup("adult")).toBe(false);
  });

  it("allows public social only for adults with explicit opt-in", () => {
    expect(canUsePublicSocial({ age_group: "adult", social_public_enabled: true })).toBe(true);
    expect(canUsePublicSocial({ age_group: "teen", social_public_enabled: true })).toBe(false);
    expect(canUsePublicSocial({ age_group: "under_13", social_public_enabled: true })).toBe(false);
    expect(canUsePublicSocial({ age_group: "adult", social_public_enabled: false })).toBe(false);
  });
});
