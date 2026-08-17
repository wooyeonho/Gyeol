import { DurableConsentedMemoryAdapter, NonProductionFileMemoryRepository } from "./durable-memory-adapter.mjs";

export function createNonProductionContinuityEntrypoint({ ownerId, rootDir }) {
  const repository = new NonProductionFileMemoryRepository({ rootDir });
  const adapter = new DurableConsentedMemoryAdapter({ ownerId, repository });

  return {
    currentRevision: () => repository.currentRevision(ownerId),
    projectState: (previousState) => adapter.projectState(previousState),
    async saveIfRevision(memory, expectedRevision) {
      if (!memory || memory.consent !== true || !memory.id) {
        return { ok: false, reason: "memory_consent_required" };
      }
      return repository.putIfRevision(ownerId, memory.id, { ...memory, revoked: false }, expectedRevision);
    },
    async revokeIfRevision(memoryId, expectedRevision) {
      const existing = (await repository.list(ownerId)).find((record) => record.id === memoryId);
      if (!existing) return { ok: false, reason: "memory_not_found", currentRevision: await repository.currentRevision(ownerId) };
      return repository.putIfRevision(ownerId, memoryId, { ...existing, revoked: true }, expectedRevision);
    },
    deleteIfRevision: (memoryId, expectedRevision) => repository.deleteIfRevision(ownerId, memoryId, expectedRevision),
  };
}
