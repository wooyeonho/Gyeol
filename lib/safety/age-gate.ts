export type AgeGroup = "under_13" | "teen" | "adult";

export const AGE_GATE_STORAGE_KEY = "gyeol_age_gate_v1";

export function isAgeGroup(value: unknown): value is AgeGroup {
  return value === "under_13" || value === "teen" || value === "adult";
}

export function isMinorAgeGroup(ageGroup: AgeGroup | null | undefined) {
  return ageGroup === "under_13" || ageGroup === "teen";
}

export function canUsePublicSocial(config: Record<string, unknown> | null | undefined) {
  const ageGroup = isAgeGroup(config?.age_group) ? config?.age_group : null;
  return ageGroup === "adult" && config?.social_public_enabled === true;
}

export function readAgeGateCompleted() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AGE_GATE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markAgeGateCompleted() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AGE_GATE_STORAGE_KEY, "1");
  } catch {
    // Ignore storage failures in restricted environments.
  }
}
