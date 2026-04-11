/**
 * World-class commerce patterns — from 10+ top shopping apps.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.15):
 *   Amazon, Shopify, Temu/SHEIN, 무신사, Coupang, Etsy, Depop/Vinted,
 *   Poshmark, StockX, Alibaba.
 */

export type CommercePrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const COMMERCE_PRINCIPLES: readonly CommercePrinciple[] = [
  { id: "one-click", source: "Amazon", rule: "Repeat purchases collapse to one tap; payment + address are resolved in the background." },
  { id: "optimized-checkout", source: "Shopify", rule: "Checkout is 3 screens max; fields are auto-filled from prior sessions." },
  { id: "gamified-shopping", source: "Temu / SHEIN", rule: "Discount wheels, timed deals, and reward trails drive impulse purchases — consent first." },
  { id: "lookbook-curation", source: "무신사", rule: "Products live inside lookbooks so buyers shop outfits, not SKUs." },
  { id: "rocket-delivery", source: "Coupang", rule: "Same/next-day delivery is a promise on every product card, not a surprise at checkout." },
  { id: "story-product", source: "Etsy", rule: "Each listing tells a maker story; handmade provenance is the product." },
  { id: "social-secondhand", source: "Depop / Vinted", rule: "Secondhand marketplace doubles as a social feed; seller is a persona." },
  { id: "seller-tags", source: "Poshmark", rule: "Seller-curated hashtags drive discovery more than category trees." },
  { id: "resale-price-graph", source: "StockX", rule: "Resale marketplaces show historical price charts next to the buy button." },
  { id: "b2b-catalog", source: "Alibaba", rule: "B2B tiers carry MOQ + lead-time + certification badges as first-class metadata." },
] as const;

/* ── Cart math ──────────────────────────────────────────────────────── */

export type CartLine = {
  productId: string;
  unitPriceMinor: number;
  quantity: number;
};

export type CartTotals = {
  subtotalMinor: number;
  discountMinor: number;
  shippingMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export function cartTotals(
  lines: readonly CartLine[],
  opts: {
    discountMinor?: number;
    shippingMinor?: number;
    taxRate?: number;
  } = {},
): CartTotals {
  const subtotalMinor = lines.reduce(
    (sum, l) => sum + l.unitPriceMinor * l.quantity,
    0,
  );
  const discountMinor = Math.min(subtotalMinor, opts.discountMinor ?? 0);
  const shippingMinor = opts.shippingMinor ?? 0;
  const taxableBase = Math.max(0, subtotalMinor - discountMinor);
  const taxMinor = Math.round(taxableBase * (opts.taxRate ?? 0));
  const totalMinor = taxableBase + shippingMinor + taxMinor;
  return { subtotalMinor, discountMinor, shippingMinor, taxMinor, totalMinor };
}

/* ── Free-shipping threshold nudge ──────────────────────────────────── */

export function freeShippingGap(
  subtotalMinor: number,
  thresholdMinor: number,
): number {
  return Math.max(0, thresholdMinor - subtotalMinor);
}

/* ── Resale price series ────────────────────────────────────────────── */

export type PricePoint = { t: number; priceMinor: number };

export function priceTrend(
  series: readonly PricePoint[],
): "up" | "down" | "flat" {
  if (series.length < 2) return "flat";
  const first = series[0].priceMinor;
  const last = series[series.length - 1].priceMinor;
  const diff = last - first;
  const pct = Math.abs(diff / (first || 1));
  if (pct < 0.02) return "flat";
  return diff > 0 ? "up" : "down";
}
