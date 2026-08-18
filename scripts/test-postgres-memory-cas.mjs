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

assert.deepEqual(await a.read(), { ok:true, revision:0, consent:false, revoked:false, memories:[], aiIdentity:"AI_COMPANION" });
assert.deepEqual(await a.save({ expectedRevision:0, memories:[{ id:"m1", text:"likes rain" }], consent:true }), { ok:true, revision:1 });
assert.equal((await other.read()).revision, 0);

const [one, two] = await Promise.all([
  a.save({ expectedRevision:1, memories:[{ id:"m2", text:"continuity" }], consent:true }),
  b.save({ expectedRevision:1, memories:[{ id:"m3", text:"stale fork" }], consent:true }),
]);
assert.equal([one,two].filter(x=>x.ok).length, 1);
assert.equal([one,two].filter(x=>!x.ok && x.reason==="stale_revision").length, 1);
const latest = await a.read();
assert.equal(latest.revision, 2);
assert.equal(latest.aiIdentity, "AI_COMPANION");
assert.equal(latest.memories.length, 1);

const stalePreRevokeRevision = latest.revision;
assert.deepEqual(await a.revoke({ expectedRevision:stalePreRevokeRevision }), { ok:true, revision:3 });
const staleResurrection = await b.save({ expectedRevision:stalePreRevokeRevision, memories:[{ id:"resurrect", text:"must never return" }], consent:true });
assert.deepEqual(staleResurrection, { ok:false, reason:"stale_revision", currentRevision:3 });
const revoked = await b.read();
assert.equal(revoked.revoked, true);
assert.deepEqual(revoked.memories, []);
assert.equal(revoked.aiIdentity, "AI_COMPANION");

assert.deepEqual(await b.delete({ expectedRevision:2 }), { ok:false, reason:"stale_revision", currentRevision:3 });
assert.deepEqual(await a.delete({ expectedRevision:3 }), { ok:true, revision:4 });
assert.equal((await a.read()).revision, 0);

await Promise.all([adminPool.end(), poolA.end(), poolB.end(), poolOther.end()]);
console.log(JSON.stringify({
  status:"PASS",
  independentConnections:3,
  ownerIsolation:true,
  staleWriteRejected:true,
  stalePostRevokeResurrectionRejected:true,
  revokeClearsMemory:true,
  aiIdentity:"AI_COMPANION"
}));
