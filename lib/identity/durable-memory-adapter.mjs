import { applyConsentedMemoryToCompanionState } from "./memory-continuity.mjs";

export class DurableConsentedMemoryAdapter {
  constructor({ ownerId, repository }) {
    if (typeof ownerId !== "string" || !ownerId.trim()) throw new Error("owner_id_required");
    if (!repository || typeof repository.list !== "function" || typeof repository.put !== "function" || typeof repository.delete !== "function") {
      throw new Error("memory_repository_required");
    }
    this.ownerId = ownerId.trim();
    this.repository = repository;
  }

  async save(memory) {
    if (!memory || memory.consent !== true || !memory.id) return { ok: false, reason: "memory_consent_required" };
    await this.repository.put(this.ownerId, memory.id, { ...memory, revoked: false });
    return { ok: true };
  }

  async revoke(memoryId) {
    const existing = (await this.repository.list(this.ownerId)).find((record) => record.id === memoryId);
    if (!existing) return { ok: false, reason: "memory_not_found" };
    await this.repository.put(this.ownerId, memoryId, { ...existing, revoked: true });
    return { ok: true };
  }

  async delete(memoryId) {
    return { ok: await this.repository.delete(this.ownerId, memoryId) };
  }

  async activeMemories() {
    const records = await this.repository.list(this.ownerId);
    return records.filter((record) => record.revoked !== true && record.consent === true);
  }

  async projectState(previousState) {
    let state = { ...(previousState ?? {}), aiIdentity: "AI_COMPANION", memoryIds: [], preferences: {} };
    for (const memory of await this.activeMemories()) {
      const applied = applyConsentedMemoryToCompanionState({ memory, previousState: state });
      if (applied.ok) state = applied.state;
    }
    return { ...state, aiIdentity: "AI_COMPANION" };
  }
}
