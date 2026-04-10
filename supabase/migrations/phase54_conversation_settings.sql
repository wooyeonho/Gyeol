-- Conversation settings per user
-- Allows users to control tone, communication style, and topic restrictions
CREATE TABLE IF NOT EXISTS conversation_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL UNIQUE,
  -- Tone sliders: -1 to 1 range
  tone_serious_humorous float DEFAULT 0 CHECK (tone_serious_humorous BETWEEN -1 AND 1),
  tone_warm_logical float DEFAULT 0 CHECK (tone_warm_logical BETWEEN -1 AND 1),
  tone_brief_detailed float DEFAULT 0 CHECK (tone_brief_detailed BETWEEN -1 AND 1),
  -- Language preference
  response_language text DEFAULT 'ko' CHECK (response_language IN ('ko', 'en', 'auto')),
  -- Topic restrictions (JSON array of restricted topics)
  restricted_topics jsonb DEFAULT '[]'::jsonb,
  -- Updated timestamp
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE conversation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own conversation settings" ON conversation_settings
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS conversation_settings_user_idx ON conversation_settings (user_id);
