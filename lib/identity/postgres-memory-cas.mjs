export const AI_IDENTITY = "AI_COMPANION";

export async function ensureMemoryCasSchema(query) {
  await query(`create table if not exists gyeol_memory_cas (
    owner_id text primary key,
    revision integer not null check (revision >= 1),
    consent boolean not null,
    revoked boolean not null default false,
    memories jsonb not null default '[]'::jsonb,
    ai_identity text not null check (ai_identity = 'AI_COMPANION')
  )`);
}

export function createPostgresMemoryCasAdapter({ query, ownerId }) {
  if (typeof query !== "function") throw new Error("query_required");
  if (typeof ownerId !== "string" || !ownerId.trim()) throw new Error("owner_id_required");
  const owner = ownerId.trim();
  return {
    async read() {
      const result = await query("select revision, consent, revoked, memories, ai_identity from gyeol_memory_cas where owner_id=$1", [owner]);
      const row = result.rows[0];
      if (!row) return { ok: true, revision: 0, consent: false, revoked: false, memories: [], aiIdentity: AI_IDENTITY };
      return { ok: true, revision: row.revision, consent: row.consent, revoked: row.revoked, memories: row.memories, aiIdentity: AI_IDENTITY };
    },
    async save({ expectedRevision, memories, consent }) {
      if (consent !== true) return { ok: false, reason: "memory_consent_required" };
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0 || !Array.isArray(memories)) return { ok: false, reason: "invalid_input" };
      const next = expectedRevision + 1;
      const result = expectedRevision === 0
        ? await query(`insert into gyeol_memory_cas(owner_id, revision, consent, revoked, memories, ai_identity)
            values($1,$2,true,false,$3::jsonb,'AI_COMPANION') on conflict do nothing returning revision`, [owner, next, JSON.stringify(memories)])
        : await query(`update gyeol_memory_cas set revision=$2, consent=true, revoked=false, memories=$3::jsonb, ai_identity='AI_COMPANION'
            where owner_id=$1 and revision=$4 returning revision`, [owner, next, JSON.stringify(memories), expectedRevision]);
      if (result.rowCount !== 1) return { ok: false, reason: "stale_revision", currentRevision: (await this.read()).revision };
      return { ok: true, revision: next };
    },
    async revoke({ expectedRevision }) {
      const result = await query(`update gyeol_memory_cas set revision=$2, revoked=true, memories='[]'::jsonb, ai_identity='AI_COMPANION'
        where owner_id=$1 and revision=$3 returning revision`, [owner, expectedRevision + 1, expectedRevision]);
      if (result.rowCount !== 1) return { ok: false, reason: "stale_revision", currentRevision: (await this.read()).revision };
      return { ok: true, revision: expectedRevision + 1 };
    },
    async delete({ expectedRevision }) {
      const result = await query("delete from gyeol_memory_cas where owner_id=$1 and revision=$2 returning revision", [owner, expectedRevision]);
      if (result.rowCount !== 1) return { ok: false, reason: "stale_revision", currentRevision: (await this.read()).revision };
      return { ok: true, revision: expectedRevision + 1 };
    },
  };
}
