import { useCallback, useState } from "react";
import { useAgentStore } from "@/store/agent-store";
import { markAgeGateCompleted, readAgeGateCompleted } from "@/lib/safety/age-gate";

type AgeGatePayload = { ageGroup: "under_13" | "teen" | "adult"; guardianConsent: boolean };

/** Manages age-gate and onboarding state. Returns the current gating phase and completion handlers. */
export function useOnboardingGate() {
  const { fetchAgentState } = useAgentStore();

  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("gyeol_onboarded");
  });

  const [showAgeGate, setShowAgeGate] = useState(() => {
    if (typeof window === "undefined") return false;
    return !readAgeGateCompleted();
  });

  const handleOnboardingComplete = useCallback(
    async (personalityMode?: string) => {
      localStorage.setItem("gyeol_onboarded", "1");
      setShowOnboarding(false);
      if (personalityMode) {
        try {
          await fetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ personality_mode: personalityMode }),
          });
          await fetchAgentState({ silent: true });
        } catch {
          // Best-effort; onboarding should still proceed even if save fails
        }
      }
    },
    [fetchAgentState],
  );

  const handleAgeGateComplete = useCallback(
    async ({ ageGroup, guardianConsent }: AgeGatePayload) => {
      markAgeGateCompleted();
      setShowAgeGate(false);
      try {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            age_group: ageGroup,
            guardian_consent: guardianConsent,
            social_public_enabled: ageGroup === "adult",
          }),
        });
        await fetchAgentState({ silent: true });
      } catch {
        // Best-effort only; local gate completion should still proceed.
      }
    },
    [fetchAgentState],
  );

  return {
    showAgeGate,
    showOnboarding,
    handleAgeGateComplete,
    handleOnboardingComplete,
  };
}
