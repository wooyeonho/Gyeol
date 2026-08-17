import { describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNonProductionContinuitySession } from "../lib/identity/nonproduction-continuity-session.mjs";

describe("non-production continuity session", () => {
  it("survives restart, projects state, and rejects stale mutation", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "gyeol-continuity-"));
    try {
      const first = createNonProductionContinuitySession({ ownerId: "owner-a", rootDir });
      const saved = await first.saveAtRevision({ id: "m1", consent: true, kind: "preference", key: "tone", value: "calm" }, 0);
      expect(saved).toEqual({ ok: true, revision: 1 });

      const restarted = createNonProductionContinuitySession({ ownerId: "owner-a", rootDir });
      const snapshot = await restarted.snapshot({ mood: "steady" });
      expect(snapshot.revision).toBe(1);
      expect(snapshot.state.aiIdentity).toBe("AI_COMPANION");
      expect(snapshot.activeMemories.map((memory) => memory.id)).toEqual(["m1"]);

      expect(await first.deleteAtRevision("m1", 0)).toEqual({ ok: false, reason: "stale_memory_revision", currentRevision: 1 });
      expect(await restarted.revokeAtRevision("m1", 1)).toEqual({ ok: true, revision: 2 });

      const afterRevoke = createNonProductionContinuitySession({ ownerId: "owner-a", rootDir });
      const revokedSnapshot = await afterRevoke.snapshot();
      expect(revokedSnapshot.revision).toBe(2);
      expect(revokedSnapshot.activeMemories).toEqual([]);
      expect(revokedSnapshot.state.aiIdentity).toBe("AI_COMPANION");
      expect(await afterRevoke.deleteAtRevision("m1", 2)).toEqual({ ok: true, revision: 3 });
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
  });
});
