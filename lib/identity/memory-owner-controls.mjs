const AI_IDENTITY = "AI_COMPANION";

function nonNegativeInteger(value, fallback = 0) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

export function summarizeOwnerMemoryState(readResult) {
  const source = readResult && typeof readResult === "object" ? readResult : {};
  const memories = Array.isArray(source.memories) ? source.memories : [];
  return Object.freeze({
    aiIdentity: AI_IDENTITY,
    generation: nonNegativeInteger(source.generation),
    revision: nonNegativeInteger(source.revision),
    consent: source.consent === true,
    revoked: source.revoked === true,
    memoryCount: memories.length,
  });
}

export async function resetOwnerMemory({ adapter, expectedRevision, expectedGeneration }) {
  if (!adapter || typeof adapter.delete !== "function") {
    return { ok: false, reason: "memory_adapter_required" };
  }
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0 || !Number.isInteger(expectedGeneration) || expectedGeneration < 1) {
    return { ok: false, reason: "invalid_input" };
  }
  const result = await adapter.delete({ expectedRevision, expectedGeneration });
  if (!result?.ok) return result;
  return {
    ok: true,
    aiIdentity: AI_IDENTITY,
    generation: result.generation,
    resetRevision: result.revision,
    memoryCount: 0,
  };
}

export async function beginOwnerFreshGeneration({ adapter, expectedGeneration, memories = [], consent }) {
  if (!adapter || typeof adapter.beginFreshGeneration !== "function") {
    return { ok: false, reason: "memory_adapter_required" };
  }
  if (consent !== true) return { ok: false, reason: "memory_consent_required" };
  if (!Number.isInteger(expectedGeneration) || expectedGeneration < 1 || !Array.isArray(memories)) {
    return { ok: false, reason: "invalid_input" };
  }
  return adapter.beginFreshGeneration({ expectedGeneration, memories, consent: true });
}

export function exportOwnerMemoryMetadata(readResult) {
  return JSON.stringify(summarizeOwnerMemoryState(readResult));
}
