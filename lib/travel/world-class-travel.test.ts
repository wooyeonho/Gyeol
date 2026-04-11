import { describe, expect, it } from "vitest";
import {
  distanceMeters,
  pricePrediction,
  sortListings,
  TRAVEL_PRINCIPLES,
  type Listing,
} from "./world-class-travel";

describe("TRAVEL_PRINCIPLES", () => {
  it("covers 10+ principles", () => {
    expect(TRAVEL_PRINCIPLES.length).toBeGreaterThanOrEqual(10);
  });
});

describe("distanceMeters", () => {
  it("is zero for identical points", () => {
    expect(distanceMeters({ lat: 37.5, lon: 127 }, { lat: 37.5, lon: 127 })).toBeCloseTo(0, 3);
  });
  it("produces a reasonable distance for Seoul<->Busan", () => {
    const seoul = { lat: 37.5665, lon: 126.9780 };
    const busan = { lat: 35.1796, lon: 129.0756 };
    const d = distanceMeters(seoul, busan);
    expect(d).toBeGreaterThan(300_000);
    expect(d).toBeLessThan(400_000);
  });
});

describe("sortListings", () => {
  const user = { lat: 0, lon: 0 };
  const listings: Listing[] = [
    { id: "a", location: { lat: 0.01, lon: 0 }, priceKrw: 300, rating: 4.2, createdAt: 3 },
    { id: "b", location: { lat: 0.1, lon: 0 }, priceKrw: 100, rating: 4.9, createdAt: 1 },
    { id: "c", location: { lat: 0.001, lon: 0 }, priceKrw: 500, rating: 3.5, createdAt: 5 },
  ];
  it("sorts by distance ascending", () => {
    expect(sortListings(listings, "distance", user)[0].id).toBe("c");
  });
  it("sorts by price ascending", () => {
    expect(sortListings(listings, "price", user)[0].id).toBe("b");
  });
  it("sorts by rating descending", () => {
    expect(sortListings(listings, "rating", user)[0].id).toBe("b");
  });
  it("sorts by recent first", () => {
    expect(sortListings(listings, "recent", user)[0].id).toBe("c");
  });
});

describe("pricePrediction", () => {
  it("rising", () => {
    expect(pricePrediction(100, 120)).toBe("rising");
  });
  it("falling", () => {
    expect(pricePrediction(100, 80)).toBe("falling");
  });
  it("stable when within tolerance", () => {
    expect(pricePrediction(100, 102)).toBe("stable");
  });
});
