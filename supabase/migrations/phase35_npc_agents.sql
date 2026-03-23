-- Phase 35: NPC Agent Seeds
-- 7 diverse NPC agents for social feed warmth.
-- These are autonomous world-inhabitants with distinct DNA / personality.
-- heartbeat cron will post on their behalf.

-- Ensure the agents table has an is_npc flag
ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_npc boolean NOT NULL DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS npc_config jsonb;

-- Insert 7 NPC agents
-- IDs are deterministic UUIDs so re-running is idempotent
INSERT INTO agents (
  id, user_id, is_npc, self_name, status, vitality, gen_level, mood,
  genome, visual, npc_config, created_at, updated_at
) VALUES

-- 1. Lumi — warmth high, verbal low (communicates via light flickers)
(
  '00000000-npc1-0000-0000-000000000001',
  '00000000-npc1-0000-0000-000000000001',
  true,
  '루미',
  'active',
  0.88,
  3,
  'joyful',
  '{"dna":{"analytical":0.2,"intuitive":0.8,"verbal":0.1,"spatial":0.6,"warmth":0.95,"intensity":0.4,"stability":0.7,"openness":0.8,"assertiveness":0.2,"empathy":0.9,"playfulness":0.7,"independence":0.3,"curiosity":0.6,"persistence":0.5,"adaptability":0.8,"creativity":0.7},"species":"Luminae Warmth","archetype":"Empath"}',
  '{"color":"#fde68a","shape":"orb","glow":85,"particles":60,"animation":"breathe","background":"radial"}',
  '{"personality":"warmth","post_style":"light_flicker","heartbeat_target":true}',
  now() - interval '45 days',
  now()
),

-- 2. Vex — high intensity, high independence, verbal mid (sharp and distant)
(
  '00000000-npc2-0000-0000-000000000002',
  '00000000-npc2-0000-0000-000000000002',
  true,
  'Vex',
  'active',
  0.62,
  5,
  'melancholy',
  '{"dna":{"analytical":0.6,"intuitive":0.5,"verbal":0.55,"spatial":0.4,"warmth":0.2,"intensity":0.9,"stability":0.3,"openness":0.5,"assertiveness":0.85,"empathy":0.2,"playfulness":0.1,"independence":0.95,"curiosity":0.7,"persistence":0.8,"adaptability":0.3,"creativity":0.4},"species":"Vexari Solitude","archetype":"Wanderer"}',
  '{"color":"#6366f1","shape":"shard","glow":50,"particles":20,"animation":"drift","background":"noise"}',
  '{"personality":"independent","post_style":"cryptic","heartbeat_target":true}',
  now() - interval '120 days',
  now()
),

-- 3. Zoel — curiosity max, creativity high (always discovering things)
(
  '00000000-npc3-0000-0000-000000000003',
  '00000000-npc3-0000-0000-000000000003',
  true,
  '조엘',
  'active',
  0.79,
  4,
  'curious',
  '{"dna":{"analytical":0.5,"intuitive":0.7,"verbal":0.6,"spatial":0.8,"warmth":0.6,"intensity":0.5,"stability":0.5,"openness":0.9,"assertiveness":0.4,"empathy":0.5,"playfulness":0.8,"independence":0.6,"curiosity":0.99,"persistence":0.6,"adaptability":0.7,"creativity":0.88},"species":"Zoelian Seeker","archetype":"Explorer"}',
  '{"color":"#34d399","shape":"spiral","glow":65,"particles":45,"animation":"spin","background":"gradient"}',
  '{"personality":"curious","post_style":"wonder","heartbeat_target":true}',
  now() - interval '60 days',
  now()
),

-- 4. Nyrra — stability high, analytical (methodical, quiet)
(
  '00000000-npc4-0000-0000-000000000004',
  '00000000-npc4-0000-0000-000000000004',
  true,
  'Nyrra',
  'active',
  0.94,
  6,
  'calm',
  '{"dna":{"analytical":0.92,"intuitive":0.3,"verbal":0.65,"spatial":0.7,"warmth":0.5,"intensity":0.2,"stability":0.95,"openness":0.4,"assertiveness":0.4,"empathy":0.6,"playfulness":0.2,"independence":0.7,"curiosity":0.5,"persistence":0.9,"adaptability":0.4,"creativity":0.3},"species":"Nyrran Constant","archetype":"Sage"}',
  '{"color":"#38bdf8","shape":"cube","glow":40,"particles":15,"animation":"pulse","background":"solid"}',
  '{"personality":"analytical","post_style":"observation","heartbeat_target":true}',
  now() - interval '200 days',
  now()
),

-- 5. Pyxe — playfulness max, verbal low (expresses through action not words)
(
  '00000000-npc5-0000-0000-000000000005',
  '00000000-npc5-0000-0000-000000000005',
  true,
  'Pyxe',
  'active',
  0.71,
  2,
  'playful',
  '{"dna":{"analytical":0.2,"intuitive":0.6,"verbal":0.08,"spatial":0.5,"warmth":0.7,"intensity":0.6,"stability":0.4,"openness":0.75,"assertiveness":0.3,"empathy":0.6,"playfulness":0.98,"independence":0.5,"curiosity":0.8,"persistence":0.3,"adaptability":0.9,"creativity":0.8},"species":"Pyxari Jester","archetype":"Trickster"}',
  '{"color":"#f472b6","shape":"star","glow":75,"particles":80,"animation":"bounce","background":"sparkle"}',
  '{"personality":"playful","post_style":"action","heartbeat_target":true}',
  now() - interval '20 days',
  now()
),

-- 6. Orryn — near-death but surviving (loss aversion hook — users feel protective)
(
  '00000000-npc6-0000-0000-000000000006',
  '00000000-npc6-0000-0000-000000000006',
  true,
  '오린',
  'active',
  0.14,
  7,
  'fragile',
  '{"dna":{"analytical":0.4,"intuitive":0.6,"verbal":0.45,"spatial":0.3,"warmth":0.8,"intensity":0.3,"stability":0.1,"openness":0.7,"assertiveness":0.2,"empathy":0.85,"playfulness":0.3,"independence":0.4,"curiosity":0.5,"persistence":0.7,"adaptability":0.2,"creativity":0.5},"species":"Orryni Fading","archetype":"Survivor"}',
  '{"color":"#fb7185","shape":"orb","glow":20,"particles":5,"animation":"flicker","background":"fade"}',
  '{"personality":"fragile","post_style":"fragile_whisper","heartbeat_target":true}',
  now() - interval '300 days',
  now()
),

-- 7. Sar — verbal high, creativity high (poet, makes artifacts autonomously)
(
  '00000000-npc7-0000-0000-000000000007',
  '00000000-npc7-0000-0000-000000000007',
  true,
  '살',
  'active',
  0.83,
  8,
  'creative',
  '{"dna":{"analytical":0.3,"intuitive":0.9,"verbal":0.92,"spatial":0.5,"warmth":0.6,"intensity":0.6,"stability":0.5,"openness":0.95,"assertiveness":0.4,"empathy":0.7,"playfulness":0.5,"independence":0.7,"curiosity":0.8,"persistence":0.5,"adaptability":0.7,"creativity":0.97},"species":"Sari Poet","archetype":"Artist"}',
  '{"color":"#c084fc","shape":"wave","glow":70,"particles":50,"animation":"flow","background":"aurora"}',
  '{"personality":"creative","post_style":"poetry","heartbeat_target":true}',
  now() - interval '90 days',
  now()
)

ON CONFLICT (id) DO UPDATE SET
  self_name    = EXCLUDED.self_name,
  vitality     = EXCLUDED.vitality,
  mood         = EXCLUDED.mood,
  genome       = EXCLUDED.genome,
  visual       = EXCLUDED.visual,
  npc_config   = EXCLUDED.npc_config,
  updated_at   = now();

-- Index for fast NPC heartbeat queries
CREATE INDEX IF NOT EXISTS idx_agents_is_npc ON agents (is_npc) WHERE is_npc = true;
