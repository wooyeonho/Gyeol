/**
 * World-class fintech / payment patterns — synthesized from 12+ top apps.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.6):
 *   Toss, Revolut, Cash App, Wise, Robinhood, Stripe, Apple Pay, Venmo,
 *   PayPal, Monzo/N26, KakaoPay, Nu Bank.
 *
 * Focuses on UX primitives (one-tap actions, transparent pricing,
 * multi-currency formatting, escrow states) rather than actual money
 * movement — which must stay in `lib/billing/*`.
 */

export type FintechPrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const FINTECH_PRINCIPLES: readonly FintechPrinciple[] = [
  {
    id: "one-tap-transfer",
    source: "Toss",
    rule: "Most-common payment flows compress to a single tap + biometric confirm.",
  },
  {
    id: "transparent-fx",
    source: "Wise",
    rule: "Show mid-market rate alongside the quoted rate; never hide the spread.",
  },
  {
    id: "multi-currency-wallet",
    source: "Revolut",
    rule: "Wallet carries multiple currencies in parallel; no hidden conversion on receive.",
  },
  {
    id: "social-payment",
    source: "Venmo",
    rule: "Payments carry optional captions + emoji; public by default but user-toggleable.",
  },
  {
    id: "escrow-mode",
    source: "PayPal",
    rule: "High-risk transfers enter escrow with explicit release conditions.",
  },
  {
    id: "auto-category",
    source: "Monzo / N26",
    rule: "Transactions are auto-categorized at capture; user can edit, and the category sticks.",
  },
  {
    id: "in-chat-payment",
    source: "KakaoPay",
    rule: "Payments can flow inside a conversation thread without leaving the app.",
  },
  {
    id: "tap-confirm",
    source: "Apple Pay",
    rule: "NFC/biometric confirm replaces password entry at point of sale.",
  },
  {
    id: "number-theatre",
    source: "Robinhood",
    rule: "Balance changes animate via rAF; semantic color encodes direction.",
  },
  {
    id: "developer-dashboard",
    source: "Stripe",
    rule: "Every pricing page doubles as a live dashboard — no marketing-only pages.",
  },
  {
    id: "card-ui-motif",
    source: "Nu Bank",
    rule: "Card artwork is central; primary brand surface is the card, not a logo.",
  },
  {
    id: "transparent-pricing",
    source: "Stripe / Linear",
    rule: "Pricing is visible without login; per-transaction cost shown next to totals.",
  },
] as const;

/* ── Currency formatting (locale-aware, no i18n lib) ──────────────────── */

export type CurrencyCode = "KRW" | "USD" | "EUR" | "JPY" | "GBP";

export const CURRENCY_FRACTION: Record<CurrencyCode, number> = {
  KRW: 0,
  JPY: 0,
  USD: 2,
  EUR: 2,
  GBP: 2,
};

export const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  KRW: "₩",
  USD: "$",
  EUR: "€",
  JPY: "¥",
  GBP: "£",
};

/**
 * Format an amount in minor units (cents, jeon) into a display string.
 * Deterministic; no Intl dependency needed — safe for tests and SSR.
 */
export function formatCurrency(minorUnits: number, code: CurrencyCode): string {
  const frac = CURRENCY_FRACTION[code];
  const sign = minorUnits < 0 ? "-" : "";
  const abs = Math.abs(minorUnits);
  const divisor = Math.pow(10, frac);
  const whole = Math.floor(abs / divisor);
  const fraction = abs % divisor;
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (frac === 0) return `${sign}${CURRENCY_SYMBOL[code]}${wholeStr}`;
  return `${sign}${CURRENCY_SYMBOL[code]}${wholeStr}.${fraction.toString().padStart(frac, "0")}`;
}

/* ── FX spread transparency ───────────────────────────────────────────── */

/** Return the spread % between a quoted rate and the mid-market rate. */
export function spreadPct(quotedRate: number, midRate: number): number {
  if (midRate === 0) return 0;
  return ((quotedRate - midRate) / midRate) * 100;
}

/** Wise-style transparency rating: A (<0.5%) ... E (>3%). */
export function spreadGrade(spread: number): "A" | "B" | "C" | "D" | "E" {
  const abs = Math.abs(spread);
  if (abs < 0.5) return "A";
  if (abs < 1) return "B";
  if (abs < 2) return "C";
  if (abs < 3) return "D";
  return "E";
}

/* ── Escrow state machine ────────────────────────────────────────────── */

export type EscrowState = "pending" | "held" | "released" | "refunded" | "disputed";

export function transitionEscrow(
  state: EscrowState,
  event: "hold" | "release" | "refund" | "dispute" | "resolve",
): EscrowState {
  if (state === "pending" && event === "hold") return "held";
  if (state === "held" && event === "release") return "released";
  if (state === "held" && event === "refund") return "refunded";
  if (state === "held" && event === "dispute") return "disputed";
  if (state === "disputed" && event === "resolve") return "released";
  return state;
}

/* ── Auto-categorization rules ────────────────────────────────────────── */

export type TxCategory =
  | "food"
  | "transport"
  | "entertainment"
  | "utilities"
  | "shopping"
  | "income"
  | "transfer"
  | "other";

const CATEGORY_KEYWORDS: Record<TxCategory, readonly string[]> = {
  food: ["starbucks", "배민", "요기요", "mcdonald", "kfc", "cafe"],
  transport: ["uber", "lyft", "kakao t", "subway", "bus", "택시"],
  entertainment: ["netflix", "spotify", "tving", "steam"],
  utilities: ["kt", "skt", "lg u+", "electric", "gas"],
  shopping: ["amazon", "coupang", "무신사", "shopify", "musinsa"],
  income: ["payroll", "급여", "stripe", "adyen"],
  transfer: ["transfer", "송금", "atm"],
  other: [],
};

export function categorizeTransaction(description: string): TxCategory {
  const lower = description.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    TxCategory,
    readonly string[],
  ][]) {
    for (const k of keywords) {
      if (lower.includes(k.toLowerCase())) return cat;
    }
  }
  return "other";
}
