import { applyConsentedMemoryToCompanionState } from "./memory-continuity.mjs";

export class ConsentedMemoryStoreAdapter {
  constructor() {
    this.records = new Map();
  }

  save(memory) {
    if (!memory || memory.consent !== true || !memory.id) {
      return { ok: false, reason: "memory_consent_required" };
    }
    this.records.set(memory.id, { ...memory, revoked: false });
    return { ok: true };
  }

  revoke(memoryId) {
    const existing = this.records.get(memoryId);
    if (!existing) return { ok: false, reason: "memory_not_found" };
    this.records.set(memoryId, { ...existing, revoked: true });
    return { ok: true };
  }

  delete(memoryId) {
    return { ok: this.records.delete(memoryId) };
  }

  activeMemories() {
    return [...this.records.values()].filter((record) => record.revoked !== true);
  }

  projectState(previousState) {
    let state = { ...(previousState ?? {}), aiIdentity: "AI_COMPANION", memoryIds: [], preferences: {} };
    for (const memory of this.activeMemories()) {
      const applied = applyConsentedMemoryToCompanionState({ memory, previousState: state });
      if (applied.ok) state = applied.state;
    }
    return { ...state, aiIdentity: "AI_COMPANION" };
  }
}
