import { describe, expect, it } from "vitest";
import { applyConsentedMemoryToCompanionState, rehydrateCompanionState } from "../lib/identity/memory-continuity.mjs";

describe("trustworthy memory-state continuity", () => {
  it("rejects unconsented memory without changing state", () => {
    const previousState = { aiIdentity: "AI_COMPANION", memoryIds: [], continuityVersion: 0 };
    const result = applyConsentedMemoryToCompanionState({
      memory: { id: "m1", kind: "preference", key: "drink", value: "보리차", consent: false },
      previousState,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("memory_consent_required");
    expect(result.state).toBe(previousState);
  });

  it("persists a consented preference across a fresh session while preserving clear AI identity", () => {
    const applied = applyConsentedMemoryToCompanionState({
      memory: { id: "m2", kind: "preference", key: "drink", value: "보리차", consent: true },
      previousState: { aiIdentity: "AI_COMPANION", memoryIds: [], continuityVersion: 0 },
    });
    expect(applied.ok).toBe(true);
    const freshSession = rehydrateCompanionState(JSON.stringify(applied.state));
    expect(freshSession.aiIdentity).toBe("AI_COMPANION");
    expect(freshSession.memoryIds).toEqual(["m2"]);
    expect(freshSession.preferences.drink).toBe("보리차");
    expect(freshSession.continuityVersion).toBe(1);
  });
});
