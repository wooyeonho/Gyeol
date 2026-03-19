import { describe, it, expect } from "vitest";
import { isAgeAllowed } from "./age-guard";

describe("isAgeAllowed", () => {
  it("allows adult for adult-required features", () => {
    expect(isAgeAllowed("adult", "adult")).toBe(true);
  });

  it("blocks teen for adult-required features", () => {
    expect(isAgeAllowed("teen", "adult")).toBe(false);
  });

  it("blocks under_13 for adult-required features", () => {
    expect(isAgeAllowed("under_13", "adult")).toBe(false);
  });

  it("allows teen for teen-required features", () => {
    expect(isAgeAllowed("teen", "teen")).toBe(true);
  });

  it("allows adult for teen-required features", () => {
    expect(isAgeAllowed("adult", "teen")).toBe(true);
  });

  it("blocks under_13 for teen-required features", () => {
    expect(isAgeAllowed("under_13", "teen")).toBe(false);
  });
});
