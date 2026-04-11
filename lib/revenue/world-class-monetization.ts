/**
 * World-class monetization patterns — synthesized from 10+ top-grossing apps.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md):
 *   Tinder, Duolingo, Candy Crush, Genshin Impact, Spotify, YouTube Premium,
 *   Netflix, Disney+, TikTok Live, Calm, Notion, Linear.
 *
 * This module complements `lib/revenue/paywall-triggers.ts`:
 *   — paywall-triggers.ts handles *when* to show a paywall.
 *   — this file handles *what* to offer: plans, bundles, discounts, pity,
 *     ad-reward boosts, and family seats.
 *
 * Everything here is **pure data + pure functions** — no I/O, no side effects.
 * Checkout sessions still go through `lib/billing/*`; this is the catalog.
 */

/* ── Plan catalog ──────────────────────────────────────────────────────── */

export type PlanId = "free" | "pro" | "premium" | "family" | "enterprise";
export type BillingPeriod = "monthly" | "annual";

export type PlanFeature = {
  id: string;
  label: string;
  /** If true this feature is a hard gate — free users literally cannot use it. */
  hardGate?: boolean;
};

export type Plan = {
  id: PlanId;
  name: string;
  /** Korean-won base price per billing period. */
  priceKRW: Record<BillingPeriod, number>;
  /** Annual savings vs 12× monthly, expressed as % (Spotify/Calm pattern). */
  annualSavingsPct: number;
  /** Up to N seats share a single subscription (Spotify Family, Apple One). */
  seats: number;
  /** Which features unlock. */
  features: readonly PlanFeature[];
  /** Short marketing tagline for pricing page. */
  tagline: string;
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceKRW: { monthly: 0, annual: 0 },
    annualSavingsPct: 0,
    seats: 1,
    tagline: "결을 처음 만나는 단계",
    features: [
      { id: "core_chat", label: "매일 30회 대화" },
      { id: "basic_memory", label: "최근 200개 기억 회상" },
      { id: "one_creature", label: "결 1마리" },
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceKRW: { monthly: 19_900, annual: 199_000 }, // 2 months free
    annualSavingsPct: 17,
    seats: 1,
    tagline: "오래 기억하고, 깊이 성장하는 결",
    features: [
      { id: "unlimited_chat", label: "무제한 대화" },
      { id: "unlimited_memory", label: "무제한 장기 기억", hardGate: true },
      { id: "evolution_cinematic", label: "시네마틱 진화 세레모니" },
      { id: "streak_shield", label: "스트릭 쉴드 월 2회" },
      { id: "export", label: "전체 내보내기 / IPFS 증명" },
      { id: "multi_creature", label: "결 3마리까지" },
    ],
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceKRW: { monthly: 39_900, annual: 399_000 },
    annualSavingsPct: 17,
    seats: 1,
    tagline: "목소리, 이미지, 프로액티브 — 결의 전부",
    features: [
      { id: "voice_mode", label: "적응형 음성 모드", hardGate: true },
      { id: "image_artifacts", label: "AI 이미지 아티팩트 무제한", hardGate: true },
      { id: "proactive_starters", label: "프로액티브 대화 starter" },
      { id: "dream_log", label: "드림 로그 / 자율 리플렉션" },
      { id: "priority_ai", label: "우선 큐 + 고성능 모델 라우팅" },
      { id: "all_pro_features", label: "Pro의 모든 기능 포함" },
    ],
  },
  family: {
    id: "family",
    name: "Family",
    priceKRW: { monthly: 59_900, annual: 599_000 },
    annualSavingsPct: 17,
    seats: 5,
    tagline: "가족/친구 5명이 함께 키우는 결 정원",
    features: [
      { id: "family_seats", label: "최대 5명 공유 좌석" },
      { id: "shared_garden", label: "공유 정원 / 패밀리 월드 이벤트" },
      { id: "all_premium_features", label: "Premium의 모든 기능 포함" },
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceKRW: { monthly: 0, annual: 0 }, // sales-led
    annualSavingsPct: 0,
    seats: 9999,
    tagline: "팀/조직용 Gyeol Engine — SSO, SLA, API 전용 쿼터",
    features: [
      { id: "sso", label: "SAML/OIDC SSO" },
      { id: "sla", label: "99.9% SLA / 전담 지원" },
      { id: "api_quota", label: "Gyeol Engine API 전용 쿼터" },
      { id: "audit_log", label: "감사 로그 내보내기" },
      { id: "dedicated_region", label: "전용 리전 / 데이터 잔류" },
    ],
  },
};

/* ── Pure helpers ──────────────────────────────────────────────────────── */

export function getPlan(id: PlanId): Plan {
  return PLANS[id];
}

export function planHasFeature(planId: PlanId, featureId: string): boolean {
  const plan = PLANS[planId];
  return plan.features.some((f) => f.id === featureId);
}

/**
 * Resolve whether a given feature is available to a user on a plan, walking
 * the upgrade chain (free < pro < premium < family). Enterprise always wins.
 */
const UPGRADE_CHAIN: readonly PlanId[] = ["free", "pro", "premium", "family", "enterprise"];

export function resolveFeatureAccess(userPlan: PlanId, featureId: string): {
  allowed: boolean;
  minimumPlan: PlanId | null;
} {
  const userRank = UPGRADE_CHAIN.indexOf(userPlan);
  for (const planId of UPGRADE_CHAIN) {
    if (planHasFeature(planId, featureId)) {
      const minRank = UPGRADE_CHAIN.indexOf(planId);
      return {
        allowed: userRank >= minRank,
        minimumPlan: planId,
      };
    }
  }
  return { allowed: true, minimumPlan: null };
}

/** Annual savings in KRW for a given plan. */
export function annualSavingsKRW(id: PlanId): number {
  const p = PLANS[id];
  return p.priceKRW.monthly * 12 - p.priceKRW.annual;
}

/* ── Gacha pity system (Genshin / FGO) ─────────────────────────────────── */

/**
 * Soft pity on a gacha pool. After `softPityAt` pulls without a rare, the
 * drop rate accelerates linearly to the hard pity ceiling `hardPityAt` where
 * a rare is guaranteed.
 *
 * Typical Genshin-like tuning: softPity 74, hardPity 90, base rate 0.6%.
 */
export type PityConfig = {
  baseRate: number;
  softPityAt: number;
  hardPityAt: number;
};

export const DEFAULT_PITY: PityConfig = {
  baseRate: 0.006,
  softPityAt: 74,
  hardPityAt: 90,
};

export function pityDropRate(pullsWithoutRare: number, cfg: PityConfig = DEFAULT_PITY): number {
  if (pullsWithoutRare >= cfg.hardPityAt) return 1;
  if (pullsWithoutRare < cfg.softPityAt) return cfg.baseRate;
  // Linear ramp from base to 1.0 across the soft→hard window.
  const window = cfg.hardPityAt - cfg.softPityAt;
  const progress = (pullsWithoutRare - cfg.softPityAt) / window;
  return cfg.baseRate + (1 - cfg.baseRate) * progress;
}

/** Determine whether a simulated pull hits, given an RNG in [0,1). */
export function simulatePull(
  pullsWithoutRare: number,
  rng: number,
  cfg: PityConfig = DEFAULT_PITY,
): { hit: boolean; rate: number } {
  const rate = pityDropRate(pullsWithoutRare, cfg);
  return { hit: rng < rate, rate };
}

/* ── Ad-reward boost (Candy Crush / Subway Surfers) ────────────────────── */

export type AdRewardId =
  | "double_daily_bonus"
  | "skip_cooldown"
  | "bonus_memory_slot"
  | "extra_starter"
  | "revive_streak";

export type AdReward = {
  id: AdRewardId;
  label: string;
  /** Cooldown between ad views for this reward in ms. */
  cooldownMs: number;
  /** Max views per day. */
  dailyCap: number;
};

export const AD_REWARDS: Record<AdRewardId, AdReward> = {
  double_daily_bonus: {
    id: "double_daily_bonus",
    label: "오늘의 데일리 보너스 2배",
    cooldownMs: 24 * 60 * 60 * 1000,
    dailyCap: 1,
  },
  skip_cooldown: {
    id: "skip_cooldown",
    label: "쿨타임 즉시 스킵",
    cooldownMs: 30 * 60 * 1000,
    dailyCap: 4,
  },
  bonus_memory_slot: {
    id: "bonus_memory_slot",
    label: "추가 기억 슬롯 +10",
    cooldownMs: 12 * 60 * 60 * 1000,
    dailyCap: 2,
  },
  extra_starter: {
    id: "extra_starter",
    label: "추가 대화 starter",
    cooldownMs: 4 * 60 * 60 * 1000,
    dailyCap: 3,
  },
  revive_streak: {
    id: "revive_streak",
    label: "스트릭 1회 부활",
    cooldownMs: 7 * 24 * 60 * 60 * 1000,
    dailyCap: 1,
  },
};

/* ── Seasonal battle pass (Fortnite / Genshin / Candy Crush) ───────────── */

export type BattlePassTier = {
  level: number;
  freeReward: string | null;
  premiumReward: string;
  xpRequired: number;
};

/** Generate a 50-tier battle pass curve with compounding XP requirements. */
export function generateBattlePass(seasonName: string): {
  season: string;
  tiers: BattlePassTier[];
} {
  const tiers: BattlePassTier[] = [];
  for (let i = 1; i <= 50; i++) {
    tiers.push({
      level: i,
      freeReward: i % 5 === 0 ? `코인 ${i * 10}` : null,
      premiumReward: i % 10 === 0 ? `한정 룸 스킨 ${i / 10}` : `경험치 부스터 ${i}`,
      xpRequired: 100 + Math.floor(i * 1.6) * 50,
    });
  }
  return { season: seasonName, tiers };
}

/* ── Bundle logic (YouTube Premium / Apple One) ────────────────────────── */

export type BundleId = "voice_plus_image" | "memory_plus_export" | "everything";

export const BUNDLES: Record<BundleId, { label: string; features: string[]; discountPct: number }> = {
  voice_plus_image: {
    label: "Voice + Image",
    features: ["voice_mode", "image_artifacts"],
    discountPct: 20,
  },
  memory_plus_export: {
    label: "Memory + Export",
    features: ["unlimited_memory", "export"],
    discountPct: 15,
  },
  everything: {
    label: "Everything",
    features: ["voice_mode", "image_artifacts", "unlimited_memory", "export", "proactive_starters"],
    discountPct: 30,
  },
};

export function bundleEffectivePriceKRW(bundleId: BundleId, basePrice: number): number {
  const bundle = BUNDLES[bundleId];
  return Math.round(basePrice * (1 - bundle.discountPct / 100));
}

/* ── Revenue analytics rollups (pure computation) ──────────────────────── */

export type RevenueEvent = {
  userId: string;
  planId: PlanId;
  amountKRW: number;
  at: number;
};

export function computeMRR(events: readonly RevenueEvent[], nowMs: number = Date.now()): number {
  const oneMonthAgo = nowMs - 30 * 24 * 60 * 60 * 1000;
  return events
    .filter((e) => e.at >= oneMonthAgo)
    .reduce((sum, e) => sum + e.amountKRW, 0);
}

export function computeARPU(
  events: readonly RevenueEvent[],
  activeUsers: number,
  nowMs: number = Date.now(),
): number {
  if (activeUsers <= 0) return 0;
  return computeMRR(events, nowMs) / activeUsers;
}
