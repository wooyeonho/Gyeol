/**
 * World-class travel / local patterns — synthesized from 12+ top apps.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.10):
 *   Airbnb, Booking.com, Google Maps, Kakao/Naver Map, 당근(Daangn), Uber,
 *   Skyscanner, Rome2Rio, TripAdvisor, DoorDash/배민, Citymapper, Hopper.
 */

export type TravelPrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const TRAVEL_PRINCIPLES: readonly TravelPrinciple[] = [
  { id: "host-narrative", source: "Airbnb", rule: "Every listing opens with the host's story, not just photos." },
  { id: "urgency-badge", source: "Booking.com", rule: "Scarcity signals are factual — based on real inventory, not fake." },
  { id: "live-traffic", source: "Google Maps", rule: "ETA updates continuously; the route itself can redraw on congestion." },
  { id: "local-detail", source: "Kakao Map / Naver Map", rule: "Local listings carry photo, menu, and reviews inline — not behind a tap." },
  { id: "hyperlocal-feed", source: "당근 (Daangn)", rule: "Feed scopes to a walkable radius by default; user can widen only deliberately." },
  { id: "eta-overlay", source: "Uber / DoorDash", rule: "During an active trip, the map is full-screen with a collapsible details sheet." },
  { id: "price-calendar", source: "Skyscanner / Hopper", rule: "Price surfaces as a calendar so users see cheap/expensive dates at a glance." },
  { id: "multi-modal", source: "Rome2Rio / Citymapper", rule: "Directions compare car + transit + walk + bike in a single view." },
  { id: "ranked-list", source: "TripAdvisor", rule: "Rankings are personalized by interest tags, not just averages." },
  { id: "price-forecast", source: "Hopper", rule: "Tell users when a price is predicted to rise or fall." },
  { id: "arrival-pulse", source: "Uber", rule: "Arriving/arrived states get a distinct, gentle haptic-like pulse." },
] as const;

export type Geo = { lat: number; lon: number };

/** Haversine distance in meters between two geo coords. */
export function distanceMeters(a: Geo, b: Geo): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type ListingSort = "distance" | "price" | "rating" | "recent";

export type Listing = {
  id: string;
  location: Geo;
  priceKrw: number;
  rating: number;
  createdAt: number;
};

export function sortListings(
  listings: readonly Listing[],
  sort: ListingSort,
  userLoc: Geo,
): Listing[] {
  const copy = [...listings];
  switch (sort) {
    case "distance":
      return copy.sort(
        (a, b) => distanceMeters(a.location, userLoc) - distanceMeters(b.location, userLoc),
      );
    case "price":
      return copy.sort((a, b) => a.priceKrw - b.priceKrw);
    case "rating":
      return copy.sort((a, b) => b.rating - a.rating);
    case "recent":
      return copy.sort((a, b) => b.createdAt - a.createdAt);
  }
}

/** Classify a predicted price direction as rising / falling / stable. */
export function pricePrediction(
  currentKrw: number,
  forecastKrw: number,
  tolerancePct = 3,
): "rising" | "falling" | "stable" {
  const delta = ((forecastKrw - currentKrw) / currentKrw) * 100;
  if (delta > tolerancePct) return "rising";
  if (delta < -tolerancePct) return "falling";
  return "stable";
}
