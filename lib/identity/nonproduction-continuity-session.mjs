import { DurableConsentedMemoryAdapter, NonProductionFileMemoryRepository } from "./durable-memory-adapter.mjs";

export function createNonProductionContinuitySession({ ownerId, rootDir }) {
  if (typeof ownerId !== "string" || !ownerId.trim()) throw new Error("owner_id_required");
  const repository = new NonProductionFileMemoryRepository({ rootDir });
  const adapter = new DurableConsentedMemoryAdapter({ ownerId: ownerId.trim(), repository });

  return {
    async snapshot(previousState) {
      return {
        revision: await repository.currentRevision(ownerId),
        state: await adapter.projectState(previousState),
        activeMemories: await adapter.activeMemories(),
      };
    },
    async saveAtRevision(memory, expectedRevision) {
      if (!memory || memory.consent !== true || !memory.id) return { ok: false, reason: "memory_consent_required" };
      return repository.putIfRevision(ownerId, memory.id, { ...memory, revoked: false }, expectedRevision);
    },
    async revokeAtRevision(memoryId, expectedRevision) {
      const existing = (await repository.list(ownerId)).find((record) => record.id === memoryId);
      if (!existing) return { ok: false, reason: "memory_not_found", currentRevision: await repository.currentRevision(ownerId) };
      return repository.putIfRevision(ownerId, memoryId, { ...existing, revoked: true }, expectedRevision);
    },
    async deleteAtRevision(memoryId, expectedRevision) {
      return repository.deleteIfRevision(ownerId, memoryId, expectedRevision);
    },
  };
}
