-- Phase 2 (phase56): Achievements persistence + diary indices + weekly mood materialization.
--
-- This migration does TWO things:
--
-- 1. Creates the `agent_achievements` table that is already referenced by
--    `app/api/achievements/route.ts`. It turns out the achievement API has been
--    silently failing whenever a user tries to view their badges because the
--    table was never materialized in any earlier migration. We back-fill the
--    schema here so the rest of the Phase 2 work can actually show unlocks.
--
-- 2. Adds a few convenience indices for Phase 2-2's emotion dashboard — fast
--    filtering of `autonomous_logs` by action_type + creation date, so the
--    weekly mood heatmap can be produced in a single range query.
--
-- Safe to re-run: everything is IF NOT EXISTS / ON CONFLICT guarded.

-- ── agent_achievements ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.agent_achievements (
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  seen boolean NOT NULL DEFAULT false,
  PRIMARY KEY (agent_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_achievements_agent
  ON public.agent_achievements (agent_id, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_achievements_unseen
  ON public.agent_achievements (agent_id)
  WHERE seen = false;

ALTER TABLE public.agent_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_achievements'
      AND policyname = 'agent_achievements_owner_select'
  ) THEN
    CREATE POLICY agent_achievements_owner_select
      ON public.agent_achievements
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.agents a
          WHERE a.id = agent_achievements.agent_id
            AND a.user_id = auth.uid()
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON public.agent_achievements TO service_role;

-- ── autonomous_logs indices (Phase 2-2 dashboard) ─────────────────────────
-- Used by /api/dashboard/mood-week which filters
-- (agent_id, action_type='diary' OR action_type='autonomous', created_at >= ...)
CREATE INDEX IF NOT EXISTS idx_autonomous_logs_agent_created
  ON public.autonomous_logs (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autonomous_logs_agent_action_type
  ON public.autonomous_logs (agent_id, action_type, created_at DESC);

-- ── featured_badges slot on agent_state (Phase 2-3 profile badge slot) ────
-- Users can pin up to 3 achievements to their profile card. Stored as
-- a text[] so a single UPDATE can reshuffle without touching the
-- achievements table. Bounded to 3 via application code.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_state'
      AND column_name = 'featured_badges'
  ) THEN
    ALTER TABLE public.agent_state
      ADD COLUMN featured_badges text[] NOT NULL DEFAULT ARRAY[]::text[];
  END IF;
END $$;
