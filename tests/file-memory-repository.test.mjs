import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { DurableConsentedMemoryAdapter } from "../lib/identity/durable-memory-adapter.mjs";
import { FileMemoryRepository } from "../lib/identity/file-memory-repository.mjs";

describe("FileMemoryRepository", () => {
  test("persists consented memory across a fresh repository while isolating owners", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gyeol-memory-"));
    const filePath = join(dir, "memory.json");
    try {
      const first = new DurableConsentedMemoryAdapter({ ownerId: "owner-a", repository: new FileMemoryRepository({ filePath }) });
      expect(await first.save({ id: "m1", consent: true, kind: "preference", key: "tea", value: "green" })).toEqual({ ok: true });

      const restarted = new DurableConsentedMemoryAdapter({ ownerId: "owner-a", repository: new FileMemoryRepository({ filePath }) });
      expect((await restarted.activeMemories()).map((m) => m.id)).toEqual(["m1"]);
      expect((await restarted.projectState({})).aiIdentity).toBe("AI_COMPANION");

      const otherOwner = new DurableConsentedMemoryAdapter({ ownerId: "owner-b", repository: new FileMemoryRepository({ filePath }) });
      expect(await otherOwner.activeMemories()).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("revoke and delete survive repository restart", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gyeol-memory-"));
    const filePath = join(dir, "memory.json");
    try {
      const adapter = new DurableConsentedMemoryAdapter({ ownerId: "owner-a", repository: new FileMemoryRepository({ filePath }) });
      await adapter.save({ id: "m1", consent: true, kind: "preference", key: "music", value: "jazz" });
      expect(await adapter.revoke("m1")).toEqual({ ok: true });
      const afterRevoke = new DurableConsentedMemoryAdapter({ ownerId: "owner-a", repository: new FileMemoryRepository({ filePath }) });
      expect(await afterRevoke.activeMemories()).toEqual([]);
      expect(await afterRevoke.delete("m1")).toEqual({ ok: true });
      const afterDelete = new DurableConsentedMemoryAdapter({ ownerId: "owner-a", repository: new FileMemoryRepository({ filePath }) });
      expect(await afterDelete.activeMemories()).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("fails closed when the on-disk envelope is tampered", async () => {
    const dir = await mkdtemp(join(tmpdir(), "gyeol-memory-"));
    const filePath = join(dir, "memory.json");
    try {
      const repo = new FileMemoryRepository({ filePath });
      await repo.put("owner-a", "m1", { id: "m1", consent: true, value: "original" });
      const envelope = JSON.parse(await readFile(filePath, "utf8"));
      envelope.payload.owners["owner-a"].m1.value = "tampered";
      await writeFile(filePath, JSON.stringify(envelope), "utf8");
      await expect(new FileMemoryRepository({ filePath }).list("owner-a")).rejects.toThrow("memory_store_tampered");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
