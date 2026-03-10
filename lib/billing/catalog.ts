export type PlanTier = "free" | "pro" | "premium";
export type SubscriptionStatus = "active" | "trialing" | "past_due" | "cancelled";
export type EntitlementKey =
  | "advanced_recaps"
  | "long_term_history"
  | "multichannel"
  | "premium_generation"
  | "priority_beta";

export type PlanDefinition = {
  badge?: string;
  cta: string;
  description: string;
  features: string[];
  priceLabel: string;
  tier: PlanTier;
};

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  free: {
    cta: "지금 시작하기",
    description: "결의 코어 경험을 시작하고 관계를 쌓기 위한 기본 플랜입니다.",
    features: [
      "기본 대화와 기억 축적",
      "활동 타임라인과 성장 앨범",
      "기본 소셜/탐험 흐름",
    ],
    priceLabel: "0원",
    tier: "free",
  },
  pro: {
    badge: "추천",
    cta: "업그레이드 관심 남기기",
    description: "더 깊은 회고와 자율성, 리텐션을 강화하는 개인용 성장 플랜입니다.",
    features: [
      "더 깊은 기억 회고와 장기 히스토리",
      "주간 리캡과 확장된 자율 모드",
      "우선 기능 베타 접근",
    ],
    priceLabel: "월 19,900원",
    tier: "pro",
  },
  premium: {
    cta: "프리미엄 관심 남기기",
    description: "멀티채널, 고급 생성, 통합 워크플로우까지 확장하는 파워 플랜입니다.",
    features: [
      "고급 생성물과 시각화",
      "외부 연동/멀티채널 경험 강화",
      "가장 빠른 신기능 접근",
    ],
    priceLabel: "월 39,900원",
    tier: "premium",
  },
};

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
