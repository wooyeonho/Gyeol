import { describe, expect, it } from "vitest";
import {
  createSharedMemoryCasAdapter,
  createSharedMemoryCasBackend,
} from "../lib/identity/shared-memory-cas.mjs";

describe("shared memory CAS continuity", () => {
  it("prevents a stale process from overwriting newer owner memory", () => {
    const backend = createSharedMemoryCasBackend();
    const processA = createSharedMemoryCasAdapter({ backend, ownerId: "owner-1" });
    const processB = createSharedMemoryCasAdapter({ backend, ownerId: "owner-1" });

    expect(processA.read()).toMatchObject({ revision: 0, aiIdentity: "AI_COMPANION" });
    expect(processB.read()).toMatchObject({ revision: 0, aiIdentity: "AI_COMPANION" });

    expect(processA.save({ expectedRevision: 0, consent: true, memories: [{ id: "m1", text: "likes quiet mornings" }] }))
      .toEqual({ ok: true, revision: 1 });

    expect(processB.save({ expectedRevision: 0, consent: true, memories: [{ id: "m2", text: "stale overwrite" }] }))
      .toEqual({ ok: false, reason: "stale_revision", currentRevision: 1 });

    expect(processB.read()).toMatchObject({ revision: 1, aiIdentity: "AI_COMPANION", memories: [{ id: "m1", text: "likes quiet mornings" }] });
  });

  it("preserves owner isolation plus consent, revoke and delete boundaries", () => {
    const backend = createSharedMemoryCasBackend();
    const ownerA = createSharedMemoryCasAdapter({ backend, ownerId: "owner-a" });
    const ownerB = createSharedMemoryCasAdapter({ backend, ownerId: "owner-b" });

    expect(ownerA.save({ expectedRevision: 0, consent: false, memories: [{ id: "m1" }] })).toEqual({ ok: false, reason: "memory_consent_required" });
    expect(ownerA.save({ expectedRevision: 0, consent: true, memories: [{ id: "m1", text: "private" }] })).toEqual({ ok: true, revision: 1 });
    expect(ownerB.read()).toMatchObject({ revision: 0, memories: [], aiIdentity: "AI_COMPANION" });

    expect(ownerA.revoke({ expectedRevision: 1 })).toEqual({ ok: true, revision: 2 });
    expect(ownerA.read()).toMatchObject({ revision: 2, revoked: true, memories: [], aiIdentity: "AI_COMPANION" });
    expect(ownerA.save({ expectedRevision: 1, consent: true, memories: [{ id: "m2", text: "stale resurrection" }] }))
      .toEqual({ ok: false, reason: "stale_revision", currentRevision: 2 });
    expect(ownerA.read()).toMatchObject({ revision: 2, revoked: true, memories: [], aiIdentity: "AI_COMPANION" });
    expect(ownerA.delete({ expectedRevision: 1 })).toEqual({ ok: false, reason: "stale_revision", currentRevision: 2 });
    expect(ownerA.delete({ expectedRevision: 2 })).toEqual({ ok: true, revision: 3 });
    expect(ownerA.read()).toMatchObject({ revision: 0, memories: [], aiIdentity: "AI_COMPANION" });
  });
});
