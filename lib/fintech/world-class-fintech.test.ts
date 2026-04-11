import { describe, expect, it } from "vitest";
import {
  categorizeTransaction,
  FINTECH_PRINCIPLES,
  formatCurrency,
  spreadGrade,
  spreadPct,
  transitionEscrow,
} from "./world-class-fintech";

describe("FINTECH_PRINCIPLES", () => {
  it("covers 10+ principles", () => {
    expect(FINTECH_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("formatCurrency", () => {
  it("formats KRW without decimals", () => {
    expect(formatCurrency(12345, "KRW")).toBe("₩12,345");
  });
  it("formats USD with 2 decimals", () => {
    expect(formatCurrency(12345, "USD")).toBe("$123.45");
  });
  it("handles negative amounts", () => {
    expect(formatCurrency(-5000, "KRW")).toBe("-₩5,000");
  });
});

describe("FX spread", () => {
  it("spreadPct positive when quoted > mid", () => {
    expect(spreadPct(1.02, 1)).toBeCloseTo(2, 5);
  });
  it("A grade for very tight spreads", () => {
    expect(spreadGrade(0.3)).toBe("A");
  });
  it("E grade for huge spreads", () => {
    expect(spreadGrade(4)).toBe("E");
  });
});

describe("escrow state machine", () => {
  it("pending -> held -> released happy path", () => {
    expect(transitionEscrow("pending", "hold")).toBe("held");
    expect(transitionEscrow("held", "release")).toBe("released");
  });
  it("disputed -> resolve back to released", () => {
    expect(transitionEscrow("disputed", "resolve")).toBe("released");
  });
  it("refund from held", () => {
    expect(transitionEscrow("held", "refund")).toBe("refunded");
  });
  it("unknown transitions are noops", () => {
    expect(transitionEscrow("released", "refund")).toBe("released");
  });
});

describe("auto-categorization", () => {
  it("recognizes food keywords", () => {
    expect(categorizeTransaction("STARBUCKS GANGNAM")).toBe("food");
    expect(categorizeTransaction("배민 주문")).toBe("food");
  });
  it("recognizes transport", () => {
    expect(categorizeTransaction("Kakao T ride")).toBe("transport");
  });
  it("defaults to other", () => {
    expect(categorizeTransaction("some random thing")).toBe("other");
  });
});
