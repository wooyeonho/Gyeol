export const AI_IDENTITY = "AI_COMPANION";

export async function ensureMemoryCasSchema(query) {
  await query(`create table if not exists gyeol_memory_cas (
    owner_id text primary key,
    revision integer not null check (revision >= 1),
    generation integer not null default 1 check (generation >= 1),
    consent boolean not null,
    revoked boolean not null default false,
    deleted boolean not null default false,
    memories jsonb not null default '[]'::jsonb,
    ai_identity text not null check (ai_identity = 'AI_COMPANION')
  )`);
  await query(`alter table gyeol_memory_cas add column if not exists deleted boolean not null default false`);
  await query(`alter table gyeol_memory_cas add column if not exists generation integer not null default 1 check (generation >= 1)`);
}

export function createPostgresMemoryCasAdapter({ query, ownerId }) {
  if (typeof query !== "function") throw new Error("query_required");
  if (typeof ownerId !== "string" || !ownerId.trim()) throw new Error("owner_id_required");
  const owner = ownerId.trim();
  return {
    async read() {
      const result = await query("select revision, generation, consent, revoked, deleted, memories, ai_identity from gyeol_memory_cas where owner_id=$1", [owner]);
      const row = result.rows[0];
      if (!row || row.deleted) return { ok: true, revision: 0, generation: row?.generation ?? 0, consent: false, revoked: false, memories: [], aiIdentity: AI_IDENTITY };
      return { ok: true, revision: row.revision, generation: row.generation, consent: row.consent, revoked: row.revoked, memories: row.memories, aiIdentity: AI_IDENTITY };
    },
    async save({ expectedRevision, expectedGeneration = 0, memories, consent }) {
      if (consent !== true) return { ok: false, reason: "memory_consent_required" };
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0 || !Number.isInteger(expectedGeneration) || expectedGeneration < 0 || !Array.isArray(memories)) return { ok: false, reason: "invalid_input" };
      const next = expectedRevision + 1;
      const result = expectedRevision === 0 && expectedGeneration === 0
        ? await query(`insert into gyeol_memory_cas(owner_id, revision, generation, consent, revoked, deleted, memories, ai_identity)
            values($1,$2,1,true,false,false,$3::jsonb,'AI_COMPANION') on conflict do nothing returning revision, generation`, [owner, next, JSON.stringify(memories)])
        : await query(`update gyeol_memory_cas set revision=$2, consent=true, revoked=false, deleted=false, memories=$3::jsonb, ai_identity='AI_COMPANION'
            where owner_id=$1 and revision=$4 and generation=$5 and deleted=false returning revision, generation`, [owner, next, JSON.stringify(memories), expectedRevision, expectedGeneration]);
      if (result.rowCount !== 1) {
        const current = await this.read();
        return { ok: false, reason: "stale_revision", currentRevision: current.revision, currentGeneration: current.generation };
      }
      return { ok: true, revision: next, generation: result.rows[0].generation };
    },
    async beginFreshGeneration({ expectedGeneration, memories = [], consent }) {
      if (consent !== true) return { ok: false, reason: "memory_consent_required" };
      if (!Number.isInteger(expectedGeneration) || expectedGeneration < 1 || !Array.isArray(memories)) return { ok: false, reason: "invalid_input" };
      const result = await query(`update gyeol_memory_cas
        set revision=1, generation=generation+1, consent=true, revoked=false, deleted=false, memories=$3::jsonb, ai_identity='AI_COMPANION'
        where owner_id=$1 and generation=$2 and deleted=true and consent=false and revoked=true
        returning revision, generation`, [owner, expectedGeneration, JSON.stringify(memories)]);
      if (result.rowCount !== 1) {
        const current = await this.read();
        return { ok: false, reason: "stale_generation", currentGeneration: current.generation };
      }
      return { ok: true, revision: 1, generation: result.rows[0].generation };
    },
    async revoke({ expectedRevision, expectedGeneration }) {
      const result = await query(`update gyeol_memory_cas set revision=$2, revoked=true, memories='[]'::jsonb, ai_identity='AI_COMPANION'
        where owner_id=$1 and revision=$3 and generation=$4 and deleted=false returning revision, generation`, [owner, expectedRevision + 1, expectedRevision, expectedGeneration]);
      if (result.rowCount !== 1) return { ok: false, reason: "stale_revision", currentRevision: (await this.read()).revision };
      return { ok: true, revision: expectedRevision + 1, generation: result.rows[0].generation };
    },
    async delete({ expectedRevision, expectedGeneration }) {
      const result = await query(`update gyeol_memory_cas
        set revision=$2, consent=false, revoked=true, deleted=true, memories='[]'::jsonb, ai_identity='AI_COMPANION'
        where owner_id=$1 and revision=$3 and generation=$4 and deleted=false returning revision, generation`, [owner, expectedRevision + 1, expectedRevision, expectedGeneration]);
      if (result.rowCount !== 1) return { ok: false, reason: "stale_revision", currentRevision: (await this.read()).revision };
      return { ok: true, revision: expectedRevision + 1, generation: result.rows[0].generation };
    },
  };
}
