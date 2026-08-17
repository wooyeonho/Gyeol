import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireOwnerFileLock, releaseOwnerFileLock } from "../lib/identity/owner-file-lock.mjs";

describe("owner file lock", () => {
  it("does not steal a live lock and only the owner token may release it", async () => {
    const root = await mkdtemp(join(tmpdir(), "gyeol-lock-live-"));
    const path = join(root, "owner.lock");
    try {
      let nowMs = 10_000;
      const first = await acquireOwnerFileLock(path, { staleMs: 5_000, now: () => nowMs });
      await expect(acquireOwnerFileLock(path, { staleMs: 5_000, now: () => nowMs + 1_000 })).rejects.toThrow("memory_store_locked");
      expect(await releaseOwnerFileLock(path, "wrong-token")).toBe(false);
      expect(JSON.parse(await readFile(path, "utf8")).token).toBe(first.token);
      expect(await releaseOwnerFileLock(path, first.token)).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("recovers a deliberately stale orphan and rotates ownership token", async () => {
    const root = await mkdtemp(join(tmpdir(), "gyeol-lock-stale-"));
    const path = join(root, "owner.lock");
    try {
      await writeFile(path, JSON.stringify({ token: "orphan-token", pid: 1, acquiredAtMs: 1_000 }), { encoding: "utf8", mode: 0o600 });
      const recovered = await acquireOwnerFileLock(path, { staleMs: 5_000, now: () => 20_000 });
      expect(recovered.recoveredStaleLock).toBe(true);
      expect(recovered.token).not.toBe("orphan-token");
      expect(JSON.parse(await readFile(path, "utf8")).token).toBe(recovered.token);
      expect(await releaseOwnerFileLock(path, recovered.token)).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
