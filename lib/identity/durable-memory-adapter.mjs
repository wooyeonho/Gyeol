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
  }
  pathFor(ownerId) {
    return join(this.rootDir, `${ownerKey(ownerId)}.json`);
  }
  async readEnvelope(ownerId) {
    try {
      const parsed = JSON.parse(await readFile(this.pathFor(ownerId), "utf8"));
      if (!parsed || !Array.isArray(parsed.records) || parsed.digest !== recordDigest(parsed.records)) throw new Error("memory_store_tampered");
      return parsed;
    } catch (error) {
      if (error?.code === "ENOENT") return { records: [], digest: recordDigest([]), updatedAt: null };
      throw error;
    }
  }
  async list(ownerId) {
    return structuredClone((await this.readEnvelope(ownerId)).records);
  }
  async persist(ownerId, records) {
    await mkdir(this.rootDir, { recursive: true });
    const envelope = { version: 1, records, digest: recordDigest(records), updatedAt: new Date().toISOString() };
    const finalPath = this.pathFor(ownerId);
    const tempPath = `${finalPath}.${randomUUID()}.tmp`;
    await writeFile(tempPath, JSON.stringify(envelope), { encoding: "utf8", flag: "wx", mode: 0o600 });
    await rename(tempPath, finalPath);
  }
  async put(ownerId, memoryId, value) {
    const records = await this.list(ownerId);
    await this.persist(ownerId, [...records.filter((record) => record.id !== memoryId), { ...structuredClone(value), id: memoryId }]);
  }
  async delete(ownerId, memoryId) {
    const records = await this.list(ownerId);
    const next = records.filter((record) => record.id !== memoryId);
    if (next.length === records.length) return false;
    await this.persist(ownerId, next);
    return true;
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
