export function isMockBillingEnabled() {
  return process.env.ENABLE_MOCK_BILLING === "true" || process.env.NODE_ENV !== "production";
}
