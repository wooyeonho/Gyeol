import { describe, expect, it } from "vitest";
import {
  cartTotals,
  COMMERCE_PRINCIPLES,
  freeShippingGap,
  priceTrend,
  type CartLine,
} from "./world-class-commerce";

describe("COMMERCE_PRINCIPLES", () => {
  it("covers 10 principles", () => {
    expect(COMMERCE_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("cartTotals", () => {
  const lines: CartLine[] = [
    { productId: "a", unitPriceMinor: 1000, quantity: 2 },
    { productId: "b", unitPriceMinor: 500, quantity: 1 },
  ];
  it("computes subtotal", () => {
    expect(cartTotals(lines).subtotalMinor).toBe(2500);
  });
  it("applies discount but not below zero", () => {
    expect(cartTotals(lines, { discountMinor: 10_000 }).discountMinor).toBe(2500);
  });
  it("applies tax rate after discount", () => {
    const t = cartTotals(lines, { taxRate: 0.1 });
    expect(t.taxMinor).toBe(250);
    expect(t.totalMinor).toBe(2750);
  });
  it("adds shipping", () => {
    const t = cartTotals(lines, { shippingMinor: 300 });
    expect(t.totalMinor).toBe(2800);
  });
});

describe("freeShippingGap", () => {
  it("returns positive gap under threshold", () => {
    expect(freeShippingGap(3000, 5000)).toBe(2000);
  });
  it("returns zero over threshold", () => {
    expect(freeShippingGap(6000, 5000)).toBe(0);
  });
});

describe("priceTrend", () => {
  it("detects upward trend", () => {
    expect(
      priceTrend([
        { t: 1, priceMinor: 100 },
        { t: 2, priceMinor: 120 },
      ]),
    ).toBe("up");
  });
  it("detects downward trend", () => {
    expect(
      priceTrend([
        { t: 1, priceMinor: 100 },
        { t: 2, priceMinor: 80 },
      ]),
    ).toBe("down");
  });
  it("flat within 2%", () => {
    expect(
      priceTrend([
        { t: 1, priceMinor: 100 },
        { t: 2, priceMinor: 101 },
      ]),
    ).toBe("flat");
  });
  it("empty returns flat", () => {
    expect(priceTrend([])).toBe("flat");
  });
});
