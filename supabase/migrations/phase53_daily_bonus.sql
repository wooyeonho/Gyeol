-- Phase 53: Daily login bonus system
-- Tracks 7-day rotating reward calendar (Genshin Impact style)

CREATE TABLE IF NOT EXISTS daily_bonuses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  claimed_at timestamptz DEFAULT now() NOT NULL,
  day_index integer NOT NULL CHECK (day_index BETWEEN 1 AND 7),  -- 1-7 cycle
  reward_type text NOT NULL,   -- 'coins' | 'item' | 'streak_shield' | 'xp'
  reward_amount integer NOT NULL DEFAULT 0,
  reward_item_id text,         -- for item rewards
  streak_day integer NOT NULL DEFAULT 1  -- cumulative streak at time of claim
);

CREATE INDEX IF NOT EXISTS daily_bonuses_user_claimed_idx ON daily_bonuses (user_id, claimed_at DESC);

-- One claim per user per day (UTC)
CREATE UNIQUE INDEX IF NOT EXISTS daily_bonuses_user_day_unique
  ON daily_bonuses (user_id, DATE(claimed_at AT TIME ZONE 'UTC'));

ALTER TABLE daily_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own daily bonuses"
  ON daily_bonuses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own daily bonuses"
  ON daily_bonuses FOR INSERT
  WITH CHECK (user_id = auth.uid());
