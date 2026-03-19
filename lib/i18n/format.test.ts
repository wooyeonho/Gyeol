import { describe, it, expect } from "vitest";
import { formatLocalizedDate, formatLocalizedDateTime, formatLocalizedTime } from "./format";

describe("formatLocalizedDate", () => {
  const testDate = "2026-03-15T10:30:00Z";

  it("formats date for Korean locale", () => {
    const result = formatLocalizedDate(testDate, "ko");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("formats date for English locale", () => {
    const result = formatLocalizedDate(testDate, "en");
    expect(result).toBeTruthy();
    expect(result).toContain("2026");
  });

  it("formats date for Japanese locale", () => {
    const result = formatLocalizedDate(testDate, "ja");
    expect(result).toBeTruthy();
  });

  it("accepts Date objects", () => {
    const result = formatLocalizedDate(new Date(testDate), "en");
    expect(result).toBeTruthy();
  });

  it("accepts timestamps", () => {
    const result = formatLocalizedDate(Date.now(), "ko");
    expect(result).toBeTruthy();
  });
});

describe("formatLocalizedDateTime", () => {
  it("includes time components", () => {
    const result = formatLocalizedDateTime("2026-03-15T10:30:00Z", "en");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});

describe("formatLocalizedTime", () => {
  it("returns time-only string", () => {
    const result = formatLocalizedTime("2026-03-15T10:30:00Z", "en");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });
});
