-- Phase 58: Narrative history — server-side persistence for BG3-style story choices
CREATE TABLE IF NOT EXISTS public.narrative_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  choice_id text NOT NULL,
  choice_type text NOT NULL,
  consequence_type text NOT NULL,
  dna_effects jsonb DEFAULT '[]'::jsonb,
  affinity_delta integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_narrative_history_user ON public.narrative_history(user_id);
CREATE INDEX IF NOT EXISTS idx_narrative_history_event ON public.narrative_history(user_id, event_id);

ALTER TABLE public.narrative_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own narrative history"
  ON public.narrative_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own narrative history"
  ON public.narrative_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
