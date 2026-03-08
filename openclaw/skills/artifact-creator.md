# Artifact creator

Role: Generate poems, diaries, unsent letters, etc. from agent state and memories. Insert into artifacts table. Types: poem, diary, unsent_letter, dream_journal, will (when vitality low).

API: Invoked from heartbeat at 25% chance (generateArtifact). Implementation: lib/artifacts/creator.ts generateArtifact(agentId). No standalone cron; called from GET /api/cron/heartbeat.
