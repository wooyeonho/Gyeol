export const FEATURE_FLAG = {
  plansSurface: "plans_surface",
  productOpsAnalytics: "product_ops_analytics",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG)[keyof typeof FEATURE_FLAG];

export const FEATURE_FLAGS: Record<FeatureFlagKey, boolean> = {
  plans_surface: true,
  product_ops_analytics: true,
};

export const EXPERIMENT = {
  firstMessageOnboarding: "first_message_onboarding",
} as const;

export type ExperimentKey = (typeof EXPERIMENT)[keyof typeof EXPERIMENT];

export const EXPERIMENT_VARIANTS = {
  first_message_onboarding: ["identity", "productivity"] as const,
} as const;

export type FirstMessageOnboardingVariant =
  (typeof EXPERIMENT_VARIANTS.first_message_onboarding)[number];
