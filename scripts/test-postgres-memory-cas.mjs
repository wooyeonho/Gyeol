import assert from "node:assert/strict";
import pg from "pg";
import { createPostgresMemoryCasAdapter, ensureMemoryCasSchema } from "../lib/identity/postgres-memory-cas.mjs";

const { Pool } = pg;
const pool = new Pool({ host: "127.0.0.1", port: 5432, user: "postgres", password: "postgres", database: "postgres", max: 4 });
const query = (text, params=[]) => pool.query(text, params);
await query("drop table if exists gyeol_memory_cas");
await ensureMemoryCasSchema(query);
const a = createPostgresMemoryCasAdapter({ query, ownerId: "owner-a" });
const b = createPostgresMemoryCasAdapter({ query, ownerId: "owner-a" });
const other = createPostgresMemoryCasAdapter({ query, ownerId: "owner-b" });

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
assert.deepEqual(await a.revoke({ expectedRevision:2 }), { ok:true, revision:3 });
const revoked = await b.read();
assert.equal(revoked.revoked, true);
assert.deepEqual(revoked.memories, []);
assert.equal(revoked.aiIdentity, "AI_COMPANION");
assert.deepEqual(await b.delete({ expectedRevision:2 }), { ok:false, reason:"stale_revision", currentRevision:3 });
assert.deepEqual(await a.delete({ expectedRevision:3 }), { ok:true, revision:4 });
assert.equal((await a.read()).revision, 0);
await pool.end();
console.log(JSON.stringify({ status:"PASS", ownerIsolation:true, staleWriteRejected:true, revokeClearsMemory:true, aiIdentity:"AI_COMPANION" }));
