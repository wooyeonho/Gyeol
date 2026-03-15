import { getIntlLocale, type Locale } from "@/lib/i18n/config";

export type PlanTier = "free" | "pro" | "premium";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "cancelled";
export type EntitlementKey =
  | "advanced_recaps"
  | "long_term_history"
  | "multichannel"
  | "premium_generation"
  | "priority_beta";

type LocalizedCopy = Partial<Record<Locale, string>>;

type PlanCatalogEntry = {
  badge?: Partial<Record<Locale, string>>;
  cta: LocalizedCopy;
  description: LocalizedCopy;
  features: LocalizedCopy[];
  price: {
    amount: number | null;
    currency: "KRW";
    interval: "month" | null;
  };
};

export type PlanDefinition = {
  badge?: string;
  cta: string;
  description: string;
  features: string[];
  priceLabel: string;
  price: PlanCatalogEntry["price"];
  tier: PlanTier;
};

const PLAN_CATALOG: Record<PlanTier, PlanCatalogEntry> = {
  free: {
    cta: {
      ko: "지금 시작하기",
      en: "Start now",
    },
    description: {
      ko: "결의 코어 경험을 시작하고 관계를 쌓기 위한 기본 플랜입니다.",
      en: "The base plan for starting Gyeol's core experience and building a relationship.",
    },
    features: [
      {
        ko: "기본 대화와 기억 축적",
        en: "Core conversation and memory building",
      },
      {
        ko: "활동 타임라인과 성장 앨범",
        en: "Activity timeline and growth album",
      },
      {
        ko: "기본 소셜/탐험 흐름",
        en: "Core social and exploration flows",
      },
    ],
    price: {
      amount: null,
      currency: "KRW",
      interval: null,
    },
  },
  pro: {
    badge: {
      ko: "추천",
      en: "Recommended",
    },
    cta: {
      ko: "업그레이드 관심 남기기",
      en: "Join the upgrade waitlist",
    },
    description: {
      ko: "더 깊은 회고와 자율성, 리텐션을 강화하는 개인용 성장 플랜입니다.",
      en: "A personal growth plan for deeper reflection, stronger autonomy, and retention.",
    },
    features: [
      {
        ko: "더 깊은 기억 회고와 장기 히스토리",
        en: "Deeper memory review and long-term history",
      },
      {
        ko: "주간 리캡과 확장된 자율 모드",
        en: "Weekly recaps and expanded autonomy",
      },
      {
        ko: "우선 기능 베타 접근",
        en: "Priority access to beta features",
      },
    ],
    price: {
      amount: 19900,
      currency: "KRW",
      interval: "month",
    },
  },
  premium: {
    cta: {
      ko: "프리미엄 관심 남기기",
      en: "Join the premium waitlist",
    },
    description: {
      ko: "멀티채널, 고급 생성, 통합 워크플로우까지 확장하는 파워 플랜입니다.",
      en: "A power plan that expands into multichannel, advanced generation, and integrated workflows.",
    },
    features: [
      {
        ko: "고급 생성물과 시각화",
        en: "Advanced generations and visualizations",
      },
      {
        ko: "외부 연동/멀티채널 경험 강화",
        en: "Stronger integrations and multichannel experiences",
      },
      {
        ko: "가장 빠른 신기능 접근",
        en: "Fastest access to new capabilities",
      },
    ],
    price: {
      amount: 39900,
      currency: "KRW",
      interval: "month",
    },
  },
};

export function formatPlanTierLabel(tier: PlanTier | null | undefined, locale: Locale): string {
  if (tier === "premium") return "Premium";
  if (tier === "pro") return "Pro";
  return locale === "ko" ? "Free" : "Free";
}

export function formatSubscriptionStatus(status: string | null | undefined, locale: Locale): string {
  if (!status) return locale === "en" ? "Not connected yet" : "아직 연결되지 않음";
  const normalized = status.toLowerCase();
  if (normalized === "active") return locale === "en" ? "Active" : "정상 사용 중";
  if (normalized === "trialing") return locale === "en" ? "Trialing" : "체험 중";
  if (normalized === "past_due") return locale === "en" ? "Past due" : "결제 확인 필요";
  if (normalized === "cancelled") return locale === "en" ? "Cancelled" : "해지됨";
  return status;
}

export function formatPlanPrice(
  price: PlanCatalogEntry["price"],
  locale: Locale
): string {
  if (price.amount == null || !price.interval) {
    return locale === "ko" ? "무료" : "Free";
  }

  const amountLabel = new Intl.NumberFormat(getIntlLocale(locale), {
    style: "currency",
    currency: price.currency,
    maximumFractionDigits: 0,
  }).format(price.amount);

  return locale === "ko" ? `월 ${amountLabel}` : `${amountLabel} / month`;
}

export function getPlanDefinition(tier: PlanTier, locale: Locale): PlanDefinition {
  const entry = PLAN_CATALOG[tier];
  const fallbackLocale: Locale = locale === "ko" ? "ko" : "en";
  return {
    badge: entry.badge?.[locale] ?? entry.badge?.[fallbackLocale],
    cta: entry.cta[locale] ?? entry.cta[fallbackLocale] ?? "",
    description: entry.description[locale] ?? entry.description[fallbackLocale] ?? "",
    features: entry.features.map((feature) => feature[locale] ?? feature[fallbackLocale] ?? ""),
    price: entry.price,
    priceLabel: formatPlanPrice(entry.price, locale),
    tier,
  };
}

export function getLocalizedPlanDefinitions(locale: Locale): Record<PlanTier, PlanDefinition> {
  return {
    free: getPlanDefinition("free", locale),
    pro: getPlanDefinition("pro", locale),
    premium: getPlanDefinition("premium", locale),
  };
}

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = getLocalizedPlanDefinitions("en");

export const ENTITLEMENTS_BY_PLAN: Record<PlanTier, EntitlementKey[]> = {
  free: [],
  pro: ["advanced_recaps", "long_term_history", "priority_beta"],
  premium: ["advanced_recaps", "long_term_history", "multichannel", "premium_generation", "priority_beta"],
};

export function resolveEntitlements(planTier: PlanTier): Record<EntitlementKey, boolean> {
  const granted = new Set(ENTITLEMENTS_BY_PLAN[planTier]);
  return {
    advanced_recaps: granted.has("advanced_recaps"),
    long_term_history: granted.has("long_term_history"),
    multichannel: granted.has("multichannel"),
    premium_generation: granted.has("premium_generation"),
    priority_beta: granted.has("priority_beta"),
  };
}
