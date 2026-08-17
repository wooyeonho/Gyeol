import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function stablePayload(payload) {
  return JSON.stringify(payload, Object.keys(payload).sort());
}

function digest(payload) {
  return createHash("sha256").update(stablePayload(payload)).digest("hex");
}

function emptyStore() {
  return { version: 1, owners: {} };
}

export class FileMemoryRepository {
  constructor({ filePath }) {
    if (typeof filePath !== "string" || !filePath.trim()) throw new Error("file_path_required");
    this.filePath = filePath;
    this.writeChain = Promise.resolve();
  }

  async _readEnvelope() {
    let raw;
    try {
      raw = await readFile(this.filePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return { payload: emptyStore(), sha256: digest(emptyStore()) };
      throw error;
    }

    let envelope;
    try {
      envelope = JSON.parse(raw);
    } catch {
      throw new Error("memory_store_corrupt_json");
    }
    if (!envelope || envelope.version !== 1 || !envelope.payload || typeof envelope.sha256 !== "string") {
      throw new Error("memory_store_invalid_envelope");
    }
    if (digest(envelope.payload) !== envelope.sha256) throw new Error("memory_store_tampered");
    return envelope;
  }

  async _writePayload(payload) {
    const envelope = { version: 1, payload, sha256: digest(payload) };
    await mkdir(dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(envelope), { encoding: "utf8", mode: 0o600 });
    await rename(tmp, this.filePath);
  }

  async _mutate(mutator) {
    const operation = this.writeChain.then(async () => {
      const { payload } = await this._readEnvelope();
      const next = structuredClone(payload);
      const result = await mutator(next);
      await this._writePayload(next);
      return result;
    });
    this.writeChain = operation.catch(() => undefined);
    return operation;
  }

  async list(ownerId) {
    if (typeof ownerId !== "string" || !ownerId.trim()) return [];
    const { payload } = await this._readEnvelope();
    const records = payload.owners?.[ownerId.trim()] ?? {};
    return Object.values(records).map((record) => structuredClone(record));
  }

  async put(ownerId, memoryId, record) {
    if (typeof ownerId !== "string" || !ownerId.trim()) throw new Error("owner_id_required");
    if (typeof memoryId !== "string" || !memoryId.trim()) throw new Error("memory_id_required");
    return this._mutate(async (next) => {
      const owner = ownerId.trim();
      next.owners ??= {};
      next.owners[owner] ??= {};
      next.owners[owner][memoryId.trim()] = { ...structuredClone(record), id: memoryId.trim() };
      return true;
    });
  }

  async delete(ownerId, memoryId) {
    if (typeof ownerId !== "string" || !ownerId.trim() || typeof memoryId !== "string" || !memoryId.trim()) return false;
    return this._mutate(async (next) => {
      const ownerRecords = next.owners?.[ownerId.trim()];
      if (!ownerRecords || !(memoryId.trim() in ownerRecords)) return false;
      delete ownerRecords[memoryId.trim()];
      if (Object.keys(ownerRecords).length === 0) delete next.owners[ownerId.trim()];
      return true;
    });
  }

  async destroyForTest() {
    await unlink(this.filePath).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
}
