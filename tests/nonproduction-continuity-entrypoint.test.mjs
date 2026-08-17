import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNonProductionContinuityEntrypoint } from "../lib/identity/nonproduction-continuity-entrypoint.mjs";

describe("non-production continuity entrypoint", () => {
  it("persists save -> restart -> projection -> revoke and rejects stale revisions", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "gyeol-continuity-"));
    try {
      const first = createNonProductionContinuityEntrypoint({ ownerId: "owner-a", rootDir });
      expect(await first.currentRevision()).toBe(0);
      expect(await first.saveIfRevision({ id: "m1", consent: true, kind: "preference", key: "tone", value: "calm" }, 0)).toEqual({ ok: true, revision: 1 });

      const afterRestart = createNonProductionContinuityEntrypoint({ ownerId: "owner-a", rootDir });
      const state = await afterRestart.projectState({});
      expect(state.aiIdentity).toBe("AI_COMPANION");
      expect(state.memoryIds).toContain("m1");
      expect(state.preferences.tone).toBe("calm");

      expect(await afterRestart.revokeIfRevision("m1", 0)).toEqual({ ok: false, reason: "stale_memory_revision", currentRevision: 1 });
      expect(await afterRestart.revokeIfRevision("m1", 1)).toEqual({ ok: true, revision: 2 });

      const finalRestart = createNonProductionContinuityEntrypoint({ ownerId: "owner-a", rootDir });
      const revokedState = await finalRestart.projectState({});
      expect(revokedState.aiIdentity).toBe("AI_COMPANION");
      expect(revokedState.memoryIds).not.toContain("m1");
      expect(await finalRestart.deleteIfRevision("m1", 1)).toEqual({ ok: false, reason: "stale_memory_revision", currentRevision: 2 });
      expect(await finalRestart.deleteIfRevision("m1", 2)).toEqual({ ok: true, revision: 3 });
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
