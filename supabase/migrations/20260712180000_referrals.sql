-- Referral loop: give a month, get a month.
--
-- Each user has a stable referral code (getbruh.app/?ref=CODE). When a new user
-- signs up via that link we record a referral. When the referred user converts
-- to a paid subscription, the referrer earns a one-month account credit.

-- Per-user stable referral code lives on preferences.
ALTER TABLE zeroed_user_preferences
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

CREATE TABLE IF NOT EXISTS zeroed_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- One referral row per referred person: the person who was invited can only
  -- be credited to a single referrer.
  referred_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | converted
  reward_granted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ,
  -- A user cannot refer themselves.
  CONSTRAINT no_self_referral CHECK (referrer_user_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON zeroed_referrals (referrer_user_id);

ALTER TABLE zeroed_referrals ENABLE ROW LEVEL SECURITY;

-- Referrers can read their own referral rows; all writes go through the
-- service-role client (which bypasses RLS).
DROP POLICY IF EXISTS "Referrers read own referrals" ON zeroed_referrals;
CREATE POLICY "Referrers read own referrals" ON zeroed_referrals
  FOR SELECT USING (referrer_user_id = auth.uid());
