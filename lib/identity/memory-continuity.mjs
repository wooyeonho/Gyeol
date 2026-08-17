export function applyConsentedMemoryToCompanionState({ memory, previousState }) {
  if (!memory || memory.consent !== true) {
    return { ok: false, reason: "memory_consent_required", state: previousState };
  }
  if (!memory.id || !memory.kind || typeof memory.value !== "string" || !memory.value.trim()) {
    return { ok: false, reason: "invalid_memory", state: previousState };
  }
  const memories = Array.isArray(previousState?.memoryIds) ? previousState.memoryIds : [];
  const memoryIds = [...new Set([...memories, memory.id])];
  const preferences = { ...(previousState?.preferences ?? {}) };
  if (memory.kind === "preference") preferences[memory.key ?? memory.id] = memory.value.trim();
  return {
    ok: true,
    state: {
      ...(previousState ?? {}),
      aiIdentity: "AI_COMPANION",
      memoryIds,
      preferences,
      continuityVersion: (previousState?.continuityVersion ?? 0) + 1,
    },
  };
}

export function rehydrateCompanionState(serialized) {
  const parsed = JSON.parse(serialized);
  return {
    ...parsed,
    aiIdentity: "AI_COMPANION",
    memoryIds: Array.isArray(parsed.memoryIds) ? [...new Set(parsed.memoryIds)] : [],
    preferences: parsed.preferences && typeof parsed.preferences === "object" ? parsed.preferences : {},
  };
}
