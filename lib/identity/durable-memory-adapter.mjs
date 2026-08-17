import { applyConsentedMemoryToCompanionState } from "./memory-continuity.mjs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { join } from "node:path";

function ownerKey(ownerId) {
  return createHash("sha256").update(ownerId).digest("hex");
}
function recordDigest(records) {
  return createHash("sha256").update(JSON.stringify(records)).digest("hex");
}

export class NonProductionFileMemoryRepository {
  constructor({ rootDir }) {
    if (typeof rootDir !== "string" || !rootDir.trim()) throw new Error("root_dir_required");
    this.rootDir = rootDir;
    this.ownerQueues = new Map();
  }
  pathFor(ownerId) {
    return join(this.rootDir, `${ownerKey(ownerId)}.json`);
  }
  async readEnvelope(ownerId) {
    try {
      const parsed = JSON.parse(await readFile(this.pathFor(ownerId), "utf8"));
      if (!parsed || !Array.isArray(parsed.records) || parsed.digest !== recordDigest(parsed.records)) throw new Error("memory_store_tampered");
      return {
        ...parsed,
        revision: Number.isInteger(parsed.revision) && parsed.revision >= 0 ? parsed.revision : 0,
        audit: Array.isArray(parsed.audit) ? parsed.audit : [],
      };
    } catch (error) {
      if (error?.code === "ENOENT") return { version: 2, records: [], digest: recordDigest([]), updatedAt: null, revision: 0, audit: [] };
      throw error;
    }
  }
  async list(ownerId) {
    return structuredClone((await this.readEnvelope(ownerId)).records);
  }
  async currentRevision(ownerId) {
    return (await this.readEnvelope(ownerId)).revision;
  }
  async serialize(ownerId, operation) {
    const key = ownerKey(ownerId);
    const previous = this.ownerQueues.get(key) ?? Promise.resolve();
    const current = previous.then(operation, operation);
    this.ownerQueues.set(key, current.catch(() => {}));
    try {
      return await current;
    } finally {
      if (this.ownerQueues.get(key) === current) this.ownerQueues.delete(key);
    }
  }
  async persist(ownerId, records, { previousEnvelope, action, memoryId } = {}) {
    await mkdir(this.rootDir, { recursive: true });
    const previous = previousEnvelope ?? await this.readEnvelope(ownerId);
    const revision = previous.revision + 1;
    const auditEntry = {
      revision,
      action: action ?? "replace",
      memoryId: memoryId ?? null,
      at: new Date().toISOString(),
    };
    const envelope = {
      version: 2,
      revision,
      records,
      digest: recordDigest(records),
      updatedAt: auditEntry.at,
      audit: [...previous.audit, auditEntry],
    };
    const finalPath = this.pathFor(ownerId);
    const tempPath = `${finalPath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, JSON.stringify(envelope), { encoding: "utf8", flag: "wx", mode: 0o600 });
    await rename(tempPath, finalPath);
    return revision;
  }
  async put(ownerId, memoryId, value) {
    return this.serialize(ownerId, async () => {
      const previous = await this.readEnvelope(ownerId);
      const records = structuredClone(previous.records);
      const next = [...records.filter((record) => record.id !== memoryId), { ...structuredClone(value), id: memoryId }];
      return this.persist(ownerId, next, { previousEnvelope: previous, action: "put", memoryId });
    });
  }
  async putIfRevision(ownerId, memoryId, value, expectedRevision) {
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new Error("expected_revision_required");
    return this.serialize(ownerId, async () => {
      const previous = await this.readEnvelope(ownerId);
      if (previous.revision !== expectedRevision) return { ok: false, reason: "stale_memory_revision", currentRevision: previous.revision };
      const next = [...previous.records.filter((record) => record.id !== memoryId), { ...structuredClone(value), id: memoryId }];
      const revision = await this.persist(ownerId, next, { previousEnvelope: previous, action: "put", memoryId });
      return { ok: true, revision };
    });
  }
  async delete(ownerId, memoryId) {
    return this.serialize(ownerId, async () => {
      const previous = await this.readEnvelope(ownerId);
      const next = previous.records.filter((record) => record.id !== memoryId);
      if (next.length === previous.records.length) return false;
      await this.persist(ownerId, next, { previousEnvelope: previous, action: "delete", memoryId });
      return true;
    });
  }
  async deleteIfRevision(ownerId, memoryId, expectedRevision) {
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new Error("expected_revision_required");
    return this.serialize(ownerId, async () => {
      const previous = await this.readEnvelope(ownerId);
      if (previous.revision !== expectedRevision) return { ok: false, reason: "stale_memory_revision", currentRevision: previous.revision };
      const next = previous.records.filter((record) => record.id !== memoryId);
      if (next.length === previous.records.length) return { ok: false, reason: "memory_not_found", currentRevision: previous.revision };
      const revision = await this.persist(ownerId, next, { previousEnvelope: previous, action: "delete", memoryId });
      return { ok: true, revision };
    });
  }
}

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