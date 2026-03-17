import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCurrentTimeSense, absenceRemark } from "./time-sense";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

describe("getCurrentTimeSense", () => {
  it("returns dawn for hours 4-6", () => {
    vi.setSystemTime(new Date("2026-01-01T05:00:00"));
    const { period } = getCurrentTimeSense();
    expect(period).toBe("dawn");
    vi.useRealTimers();
  });

  it("returns morning for hours 7-11", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T09:00:00"));
    const { period } = getCurrentTimeSense();
    expect(period).toBe("morning");
    vi.useRealTimers();
  });

  it("returns afternoon for hours 12-16", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T14:00:00"));
    const { period } = getCurrentTimeSense();
    expect(period).toBe("afternoon");
    vi.useRealTimers();
  });

  it("returns evening for hours 17-20", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T19:00:00"));
    const { period } = getCurrentTimeSense();
    expect(period).toBe("evening");
    vi.useRealTimers();
  });

  it("returns night for hours 21-23", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T22:00:00"));
    const { period } = getCurrentTimeSense();
    expect(period).toBe("night");
    vi.useRealTimers();
  });

  it("returns late_night for hours 0-3", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T02:00:00"));
    const { period } = getCurrentTimeSense();
    expect(period).toBe("late_night");
    vi.useRealTimers();
  });

  it("returns a non-empty greeting string", () => {
    const { greeting } = getCurrentTimeSense();
    expect(typeof greeting).toBe("string");
    expect(greeting.length).toBeGreaterThan(0);
  });
});

describe("absenceRemark", () => {
  it("returns null for null input", () => {
    expect(absenceRemark(null)).toBeNull();
  });

  it("returns null for 0 hours", () => {
    expect(absenceRemark(0)).toBeNull();
  });

  it("returns 'a little while' for hours 1-5", () => {
    const remark = absenceRemark(3);
    expect(remark).toContain("little while");
  });

  it("returns 'not talked today' for hours 6-23", () => {
    const remark = absenceRemark(10);
    expect(remark).toContain("today");
  });

  it("returns 'few days' for hours 24-71", () => {
    const remark = absenceRemark(48);
    expect(remark).toContain("days");
  });

  it("returns 'about a week' for hours 72-167", () => {
    const remark = absenceRemark(100);
    expect(remark).toContain("week");
  });

  it("returns 'long time' for hours >= 168", () => {
    const remark = absenceRemark(200);
    expect(remark).toContain("long time");
  });
});
