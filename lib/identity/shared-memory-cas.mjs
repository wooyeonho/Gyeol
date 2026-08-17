function clone(value) {
  return value == null ? value : structuredClone(value);
}

export function createSharedMemoryCasBackend() {
  const records = new Map();
  return {
    read(ownerId) {
      return clone(records.get(ownerId) ?? null);
    },
    compareAndSwap(ownerId, expectedRevision, nextEnvelope) {
      const current = records.get(ownerId) ?? null;
      const currentRevision = current?.revision ?? 0;
      if (currentRevision !== expectedRevision) {
        return { ok: false, reason: "stale_revision", currentRevision };
      }
      records.set(ownerId, clone(nextEnvelope));
      return { ok: true, revision: nextEnvelope.revision };
    },
    delete(ownerId, expectedRevision) {
      const current = records.get(ownerId) ?? null;
      const currentRevision = current?.revision ?? 0;
      if (currentRevision !== expectedRevision) {
        return { ok: false, reason: "stale_revision", currentRevision };
      }
      records.delete(ownerId);
      return { ok: true, revision: currentRevision + 1 };
    },
  };
}

export function createSharedMemoryCasAdapter({ backend, ownerId }) {
  if (!backend || typeof backend.read !== "function" || typeof backend.compareAndSwap !== "function") {
    throw new Error("shared_backend_required");
  }
  if (typeof ownerId !== "string" || ownerId.trim().length === 0) throw new Error("owner_id_required");
  const ownerKey = ownerId.trim();

  return {
    read() {
      const envelope = backend.read(ownerKey);
      if (!envelope) {
        return { ok: true, revision: 0, aiIdentity: "AI_COMPANION", memories: [], revoked: false };
      }
      return { ok: true, ...envelope, aiIdentity: "AI_COMPANION" };
    },

    save({ expectedRevision, memories, consent }) {
      if (consent !== true) return { ok: false, reason: "memory_consent_required" };
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) return { ok: false, reason: "invalid_revision" };
      if (!Array.isArray(memories)) return { ok: false, reason: "memories_required" };
      const next = {
        revision: expectedRevision + 1,
        aiIdentity: "AI_COMPANION",
        consent: true,
        revoked: false,
        memories: clone(memories),
      };
      return backend.compareAndSwap(ownerKey, expectedRevision, next);
    },

    revoke({ expectedRevision }) {
      if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return { ok: false, reason: "invalid_revision" };
      const current = backend.read(ownerKey);
      if (!current) return { ok: false, reason: "memory_not_found" };
      const next = {
        ...current,
        revision: expectedRevision + 1,
        aiIdentity: "AI_COMPANION",
        revoked: true,
        memories: [],
      };
      return backend.compareAndSwap(ownerKey, expectedRevision, next);
    },

    delete({ expectedRevision }) {
      if (!Number.isInteger(expectedRevision) || expectedRevision < 1) return { ok: false, reason: "invalid_revision" };
      if (typeof backend.delete !== "function") return { ok: false, reason: "delete_unsupported" };
      return backend.delete(ownerKey, expectedRevision);
    },
  };
}
