import { describe, it, expect, vi, beforeEach } from "vitest";
import { mightNeedReframe } from "./reframe";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

describe("mightNeedReframe", () => {
  it("returns true for messages containing 'fail'", () => {
    expect(mightNeedReframe("I always fail at this")).toBe(true);
  });

  it("returns true for 'failed'", () => {
    expect(mightNeedReframe("I failed again")).toBe(true);
  });

  it("returns true for 'give up'", () => {
    expect(mightNeedReframe("I want to give up")).toBe(true);
  });

  it("returns true for 'mistake'", () => {
    expect(mightNeedReframe("That was a big mistake")).toBe(true);
  });

  it("returns true for 'regret'", () => {
    expect(mightNeedReframe("I regret everything")).toBe(true);
  });

  it("returns true for 'never'", () => {
    expect(mightNeedReframe("I will never get this right")).toBe(true);
  });

  it("returns true for 'can't'", () => {
    expect(mightNeedReframe("I can't do this anymore")).toBe(true);
  });

  it("returns true for 'wrong'", () => {
    expect(mightNeedReframe("Everything went wrong today")).toBe(true);
  });

  it("returns false for positive messages", () => {
    expect(mightNeedReframe("I am doing great today!")).toBe(false);
  });

  it("returns false for neutral messages", () => {
    expect(mightNeedReframe("오늘 날씨가 맑아요")).toBe(false);
  });

  it("is case insensitive", () => {
    expect(mightNeedReframe("I FAILED")).toBe(true);
    expect(mightNeedReframe("This is a MISTAKE")).toBe(true);
  });
});
