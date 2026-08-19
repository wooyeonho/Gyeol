import assert from "node:assert/strict";
import {
  beginOwnerFreshGeneration,
  exportOwnerMemoryMetadata,
  resetOwnerMemory,
  summarizeOwnerMemoryState,
} from "../lib/identity/memory-owner-controls.mjs";

const source = {
  ok: true,
  revision: 7,
  generation: 3,
  consent: true,
  revoked: false,
  memories: [
    { id: "private-1", text: "must never be exported" },
    { id: "private-2", text: "also private" },
  ],
};

assert.deepEqual(summarizeOwnerMemoryState(source), {
  aiIdentity: "AI_COMPANION",
  generation: 3,
  revision: 7,
  consent: true,
  revoked: false,
  memoryCount: 2,
});
const exported = exportOwnerMemoryMetadata(source);
assert.equal(exported.includes("private-1"), false);
assert.equal(exported.includes("must never be exported"), false);
assert.deepEqual(JSON.parse(exported), summarizeOwnerMemoryState(source));

let deletedArgs;
const reset = await resetOwnerMemory({
  adapter: { delete: async (args) => { deletedArgs = args; return { ok: true, revision: 8, generation: 3 }; } },
  expectedRevision: 7,
  expectedGeneration: 3,
});
assert.deepEqual(deletedArgs, { expectedRevision: 7, expectedGeneration: 3 });
assert.deepEqual(reset, {
  ok: true,
  aiIdentity: "AI_COMPANION",
  generation: 3,
  resetRevision: 8,
  memoryCount: 0,
});

let freshArgs;
const fresh = await beginOwnerFreshGeneration({
  adapter: { beginFreshGeneration: async (args) => { freshArgs = args; return { ok: true, revision: 1, generation: 4 }; } },
  expectedGeneration: 3,
  memories: [{ id: "fresh", text: "explicitly re-consented" }],
  consent: true,
});
assert.deepEqual(freshArgs, {
  expectedGeneration: 3,
  memories: [{ id: "fresh", text: "explicitly re-consented" }],
  consent: true,
});
assert.deepEqual(fresh, { ok: true, revision: 1, generation: 4 });
assert.deepEqual(await beginOwnerFreshGeneration({ adapter: {}, expectedGeneration: 3, consent: true }), { ok: false, reason: "memory_adapter_required" });
assert.deepEqual(await beginOwnerFreshGeneration({ adapter: { beginFreshGeneration: async () => ({ ok: true }) }, expectedGeneration: 3, consent: false }), { ok: false, reason: "memory_consent_required" });

console.log(JSON.stringify({
  status: "PASS",
  boundedMetadataOnly: true,
  deletedMemoryContentsExcluded: true,
  resetUsesGenerationAndRevision: true,
  freshGenerationRequiresConsent: true,
  aiIdentity: "AI_COMPANION",
}));
