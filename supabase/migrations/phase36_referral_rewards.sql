-- Referral rewards table: tracks who redeemed which invite code and coin rewards
CREATE TABLE IF NOT EXISTS referral_rewards (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id UUID NOT NULL REFERENCES invite_codes(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  referrer_coins INTEGER NOT NULL DEFAULT 100,
  referred_coins INTEGER NOT NULL DEFAULT 100,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Each user can only redeem one referral
  CONSTRAINT uq_referral_referred_user UNIQUE (referred_user_id)
);

-- Index for looking up referrals by referrer (leaderboard queries)
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_user_id);

-- RLS
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Users can read their own referral records
CREATE POLICY referral_rewards_select ON referral_rewards
  FOR SELECT USING (
    auth.uid() = referrer_user_id OR auth.uid() = referred_user_id
  );

-- Only service role can insert (API route uses service client)
CREATE POLICY referral_rewards_insert ON referral_rewards
  FOR INSERT WITH CHECK (false);
