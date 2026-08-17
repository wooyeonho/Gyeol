import test from "node:test";
import assert from "node:assert/strict";
import { DurableConsentedMemoryAdapter } from "../lib/identity/durable-memory-adapter.mjs";

function repository() {
  const rows = new Map();
  return {
    async list(ownerId) { return [...rows.values()].filter((row) => row.ownerId === ownerId).map((row) => ({ ...row.value })); },
    async put(ownerId, memoryId, value) { rows.set(`${ownerId}:${memoryId}`, { ownerId, value: { ...value } }); },
    async delete(ownerId, memoryId) { return rows.delete(`${ownerId}:${memoryId}`); },
  };
}

test("consented memory survives a fresh adapter session for the same owner", async () => {
  const repo = repository();
  const first = new DurableConsentedMemoryAdapter({ ownerId: "user-a", repository: repo });
  assert.deepEqual(await first.save({ id: "m1", kind: "preference", key: "tone", value: "calm", consent: true }), { ok: true });
  const fresh = new DurableConsentedMemoryAdapter({ ownerId: "user-a", repository: repo });
  const state = await fresh.projectState({ continuityVersion: 0 });
  assert.equal(state.preferences.tone, "calm");
  assert.equal(state.aiIdentity, "AI_COMPANION");
});

test("cross-user memory is isolated and revoked/deleted memory cannot affect state", async () => {
  const repo = repository();
  const a = new DurableConsentedMemoryAdapter({ ownerId: "user-a", repository: repo });
  const b = new DurableConsentedMemoryAdapter({ ownerId: "user-b", repository: repo });
  await a.save({ id: "m1", kind: "preference", key: "tone", value: "calm", consent: true });
  assert.equal((await b.projectState({})).preferences.tone, undefined);
  await a.revoke("m1");
  assert.equal((await a.projectState({})).preferences.tone, undefined);
  await a.delete("m1");
  assert.deepEqual(await a.activeMemories(), []);
  assert.equal((await a.projectState({})).aiIdentity, "AI_COMPANION");
});

test("unconsented memory is rejected", async () => {
  const adapter = new DurableConsentedMemoryAdapter({ ownerId: "user-a", repository: repository() });
  assert.deepEqual(await adapter.save({ id: "m1", kind: "preference", value: "calm", consent: false }), { ok: false, reason: "memory_consent_required" });
});
