import assert from "node:assert/strict";
import pg from "pg";
import { createPostgresMemoryCasAdapter, ensureMemoryCasSchema } from "../lib/identity/postgres-memory-cas.mjs";

const { Pool } = pg;
const base = { host: "127.0.0.1", port: 5432, user: "postgres", password: "postgres", database: "postgres" };
const adminPool = new Pool({ ...base, max: 1 });
const poolA = new Pool({ ...base, max: 1 });
const poolB = new Pool({ ...base, max: 1 });
const poolOther = new Pool({ ...base, max: 1 });
const adminQuery = (text, params=[]) => adminPool.query(text, params);
await adminQuery("drop table if exists gyeol_memory_cas");
await ensureMemoryCasSchema(adminQuery);

const a = createPostgresMemoryCasAdapter({ query: (text, params=[]) => poolA.query(text, params), ownerId: "owner-a" });
const b = createPostgresMemoryCasAdapter({ query: (text, params=[]) => poolB.query(text, params), ownerId: "owner-a" });
const other = createPostgresMemoryCasAdapter({ query: (text, params=[]) => poolOther.query(text, params), ownerId: "owner-b" });

assert.deepEqual(await a.read(), { ok:true, revision:0, generation:0, consent:false, revoked:false, memories:[], aiIdentity:"AI_COMPANION" });
assert.deepEqual(await a.save({ expectedRevision:0, expectedGeneration:0, memories:[{ id:"m1", text:"likes rain" }], consent:true }), { ok:true, revision:1, generation:1 });
assert.equal((await other.read()).revision, 0);

const [one, two] = await Promise.all([
  a.save({ expectedRevision:1, expectedGeneration:1, memories:[{ id:"m2", text:"continuity" }], consent:true }),
  b.save({ expectedRevision:1, expectedGeneration:1, memories:[{ id:"m3", text:"stale fork" }], consent:true }),
]);
assert.equal([one,two].filter(x=>x.ok).length, 1);
assert.equal([one,two].filter(x=>!x.ok && x.reason==="stale_revision").length, 1);
const latest = await a.read();
assert.equal(latest.revision, 2);
assert.equal(latest.generation, 1);
assert.equal(latest.aiIdentity, "AI_COMPANION");
assert.equal(latest.memories.length, 1);

const stalePreRevokeRevision = latest.revision;
assert.deepEqual(await a.revoke({ expectedRevision:stalePreRevokeRevision, expectedGeneration:1 }), { ok:true, revision:3, generation:1 });
const staleResurrection = await b.save({ expectedRevision:stalePreRevokeRevision, expectedGeneration:1, memories:[{ id:"resurrect", text:"must never return" }], consent:true });
assert.equal(staleResurrection.ok, false);
const revoked = await b.read();
assert.equal(revoked.revoked, true);
assert.deepEqual(revoked.memories, []);

assert.equal((await b.delete({ expectedRevision:2, expectedGeneration:1 })).ok, false);
assert.deepEqual(await a.delete({ expectedRevision:3, expectedGeneration:1 }), { ok:true, revision:4, generation:1 });
assert.deepEqual(await a.read(), { ok:true, revision:0, generation:1, consent:false, revoked:false, memories:[], aiIdentity:"AI_COMPANION" });
const staleAfterDelete = await b.save({ expectedRevision:0, expectedGeneration:0, memories:[{ id:"deleted-return", text:"must stay deleted" }], consent:true });
assert.equal(staleAfterDelete.ok, false);

const fresh = await a.beginFreshGeneration({ expectedGeneration:1, memories:[{ id:"fresh-1", text:"explicitly re-consented" }], consent:true });
assert.deepEqual(fresh, { ok:true, revision:1, generation:2 });
const freshRead = await b.read();
assert.equal(freshRead.generation, 2);
assert.equal(freshRead.revision, 1);
assert.equal(freshRead.memories[0].id, "fresh-1");
const staleGenerationWriter = await b.save({ expectedRevision:1, expectedGeneration:1, memories:[{ id:"old-generation", text:"must lose" }], consent:true });
assert.equal(staleGenerationWriter.ok, false);
assert.equal(staleGenerationWriter.currentGeneration, 2);
const duplicateFresh = await b.beginFreshGeneration({ expectedGeneration:1, memories:[], consent:true });
assert.deepEqual(duplicateFresh, { ok:false, reason:"stale_generation", currentGeneration:2 });

await Promise.all([adminPool.end(), poolA.end(), poolB.end(), poolOther.end()]);
console.log(JSON.stringify({
  status:"PASS",
  independentConnections:3,
  ownerIsolation:true,
  staleWriteRejected:true,
  stalePostDeleteRecreationRejected:true,
  freshGenerationAfterDelete:true,
  staleGenerationRejected:true,
  duplicateFreshGenerationRejected:true,
  aiIdentity:"AI_COMPANION"
}));
