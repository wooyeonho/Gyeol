import { describe, expect, it } from "vitest";
import { ConsentedMemoryStoreAdapter } from "../lib/identity/memory-store-adapter.mjs";

describe("consent-explicit memory store adapter", () => {
  it("rejects unconsented persistence", () => {
    const store = new ConsentedMemoryStoreAdapter();
    expect(store.save({ id: "m0", kind: "preference", key: "drink", value: "물", consent: false })).toEqual({
      ok: false,
      reason: "memory_consent_required",
    });
    expect(store.activeMemories()).toEqual([]);
  });

  it("persists consented memory then removes its influence after revocation", () => {
    const store = new ConsentedMemoryStoreAdapter();
    expect(store.save({ id: "m1", kind: "preference", key: "drink", value: "보리차", consent: true })).toEqual({ ok: true });
    const remembered = store.projectState({ continuityVersion: 0 });
    expect(remembered.aiIdentity).toBe("AI_COMPANION");
    expect(remembered.preferences.drink).toBe("보리차");
    expect(remembered.memoryIds).toEqual(["m1"]);

    expect(store.revoke("m1")).toEqual({ ok: true });
    const revoked = store.projectState({ continuityVersion: 0 });
    expect(revoked.aiIdentity).toBe("AI_COMPANION");
    expect(revoked.preferences).toEqual({});
    expect(revoked.memoryIds).toEqual([]);
  });

  it("deletion removes the record entirely", () => {
    const store = new ConsentedMemoryStoreAdapter();
    store.save({ id: "m2", kind: "preference", key: "music", value: "재즈", consent: true });
    expect(store.delete("m2")).toEqual({ ok: true });
    expect(store.activeMemories()).toEqual([]);
  });
});
