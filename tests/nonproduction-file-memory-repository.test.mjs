import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DurableConsentedMemoryAdapter, NonProductionFileMemoryRepository } from "../lib/identity/durable-memory-adapter.mjs";

describe("NonProductionFileMemoryRepository", () => {
  it("survives a fresh adapter and keeps owners isolated", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "gyeol-memory-"));
    try {
      const repoA = new NonProductionFileMemoryRepository({ rootDir });
      const first = new DurableConsentedMemoryAdapter({ ownerId: "owner-a", repository: repoA });
      await first.save({ id: "m1", consent: true, kind: "preference", key: "tone", value: "calm" });
      const fresh = new DurableConsentedMemoryAdapter({ ownerId: "owner-a", repository: new NonProductionFileMemoryRepository({ rootDir }) });
      expect((await fresh.activeMemories()).map((m) => m.id)).toEqual(["m1"]);
      const other = new DurableConsentedMemoryAdapter({ ownerId: "owner-b", repository: new NonProductionFileMemoryRepository({ rootDir }) });
      expect(await other.activeMemories()).toEqual([]);
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  it("persists revoke/delete semantics across restarts", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "gyeol-memory-"));
    try {
      const repo = new NonProductionFileMemoryRepository({ rootDir });
      const adapter = new DurableConsentedMemoryAdapter({ ownerId: "owner-a", repository: repo });
      await adapter.save({ id: "m1", consent: true, kind: "preference", key: "tone", value: "calm" });
      expect((await adapter.revoke("m1")).ok).toBe(true);
      const fresh = new DurableConsentedMemoryAdapter({ ownerId: "owner-a", repository: new NonProductionFileMemoryRepository({ rootDir }) });
      expect(await fresh.activeMemories()).toEqual([]);
      expect((await fresh.delete("m1")).ok).toBe(true);
      expect(await fresh.activeMemories()).toEqual([]);
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });

  it("fails closed when persisted records are tampered", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "gyeol-memory-"));
    try {
      const repo = new NonProductionFileMemoryRepository({ rootDir });
      await repo.put("owner-a", "m1", { id: "m1", consent: true, value: "safe" });
      const path = repo.pathFor("owner-a");
      const parsed = JSON.parse(await readFile(path, "utf8"));
      parsed.records[0].value = "tampered";
      await writeFile(path, JSON.stringify(parsed));
      await expect(repo.list("owner-a")).rejects.toThrow("memory_store_tampered");
    } finally { await rm(rootDir, { recursive: true, force: true }); }
  });
});
