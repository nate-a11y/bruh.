-- Subscriptions and billing
-- Supports: 30-day trial, $19.99/month subscription, lifetime free coupon codes

-- Subscription status for users
CREATE TABLE IF NOT EXISTS zeroed_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription status
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'canceled', 'past_due', 'free_forever')),

  -- Trial tracking
  trial_started_at TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- Stripe data (null for free_forever users)
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Billing cycle
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  -- Coupon tracking
  coupon_code TEXT,
  coupon_applied_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id),
  UNIQUE(stripe_customer_id),
  UNIQUE(stripe_subscription_id)
);

-- Coupon codes table
CREATE TABLE IF NOT EXISTS zeroed_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  coupon_type TEXT NOT NULL CHECK (coupon_type IN ('free_forever', 'trial_extension', 'discount')),

  -- For discount type
  discount_percent INTEGER CHECK (discount_percent >= 0 AND discount_percent <= 100),

  -- For trial_extension type
  trial_days_extension INTEGER,

  -- Usage limits
  max_uses INTEGER, -- NULL = unlimited
  current_uses INTEGER DEFAULT 0,

  -- Validity
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track coupon redemptions
CREATE TABLE IF NOT EXISTS zeroed_coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES zeroed_coupons(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(coupon_id, user_id)
);

-- RLS policies
ALTER TABLE zeroed_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeroed_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeroed_coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own subscription
CREATE POLICY "Users can view own subscription"
  ON zeroed_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update subscriptions (via webhooks)
CREATE POLICY "Service role manages subscriptions"
  ON zeroed_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Only service role can access coupons (validation happens via SECURITY DEFINER function)
CREATE POLICY "Service role manages coupons"
  ON zeroed_coupons FOR ALL
  USING (auth.role() = 'service_role');

-- Users can see their own redemptions
CREATE POLICY "Users can view own redemptions"
  ON zeroed_coupon_redemptions FOR SELECT
  USING (auth.uid() = user_id);

-- NOTE: Coupon codes should be inserted manually via Supabase dashboard for security
-- Example: INSERT INTO zeroed_coupons (code, description, coupon_type, is_active) VALUES ('CODE', 'Description', 'free_forever', TRUE);

-- Function to check subscription status
CREATE OR REPLACE FUNCTION zeroed_check_subscription_access(p_user_id UUID)
RETURNS TABLE (
  has_access BOOLEAN,
  status TEXT,
  days_remaining INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sub RECORD;
BEGIN
  SELECT * INTO sub FROM zeroed_subscriptions WHERE user_id = p_user_id;

  -- No subscription record = new user (create one with trial)
  IF NOT FOUND THEN
    INSERT INTO zeroed_subscriptions (user_id, status, trial_started_at, trial_ends_at)
    VALUES (p_user_id, 'trialing', NOW(), NOW() + INTERVAL '30 days')
    RETURNING * INTO sub;
  END IF;

  -- Check status
  CASE sub.status
    WHEN 'free_forever' THEN
      RETURN QUERY SELECT TRUE, 'free_forever'::TEXT, NULL::INTEGER;
    WHEN 'active' THEN
      RETURN QUERY SELECT TRUE, 'active'::TEXT,
        EXTRACT(DAY FROM sub.current_period_end - NOW())::INTEGER;
    WHEN 'trialing' THEN
      IF sub.trial_ends_at > NOW() THEN
        RETURN QUERY SELECT TRUE, 'trialing'::TEXT,
          EXTRACT(DAY FROM sub.trial_ends_at - NOW())::INTEGER;
      ELSE
        -- Trial expired
        UPDATE zeroed_subscriptions SET status = 'canceled' WHERE user_id = p_user_id;
        RETURN QUERY SELECT FALSE, 'trial_expired'::TEXT, 0;
      END IF;
    WHEN 'past_due' THEN
      RETURN QUERY SELECT TRUE, 'past_due'::TEXT, 0; -- Grace period
    ELSE
      RETURN QUERY SELECT FALSE, sub.status, 0;
  END CASE;
END;
$$;

-- Function to redeem a coupon code
CREATE OR REPLACE FUNCTION zeroed_redeem_coupon(p_user_id UUID, p_code TEXT)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  new_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  coupon RECORD;
  sub RECORD;
BEGIN
  -- Find coupon
  SELECT * INTO coupon FROM zeroed_coupons
  WHERE LOWER(code) = LOWER(p_code)
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired coupon code'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if already redeemed
  IF EXISTS (SELECT 1 FROM zeroed_coupon_redemptions WHERE coupon_id = coupon.id AND user_id = p_user_id) THEN
    RETURN QUERY SELECT FALSE, 'Coupon already redeemed'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Get or create subscription
  SELECT * INTO sub FROM zeroed_subscriptions WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO zeroed_subscriptions (user_id, status) VALUES (p_user_id, 'trialing')
    RETURNING * INTO sub;
  END IF;

  -- Apply coupon based on type
  CASE coupon.coupon_type
    WHEN 'free_forever' THEN
      UPDATE zeroed_subscriptions
      SET status = 'free_forever',
          coupon_code = p_code,
          coupon_applied_at = NOW(),
          updated_at = NOW()
      WHERE user_id = p_user_id;

      -- Record redemption
      INSERT INTO zeroed_coupon_redemptions (coupon_id, user_id) VALUES (coupon.id, p_user_id);
      UPDATE zeroed_coupons SET current_uses = current_uses + 1 WHERE id = coupon.id;

      RETURN QUERY SELECT TRUE, 'Lifetime free access activated!'::TEXT, 'free_forever'::TEXT;

    WHEN 'trial_extension' THEN
      UPDATE zeroed_subscriptions
      SET trial_ends_at = COALESCE(trial_ends_at, NOW()) + (coupon.trial_days_extension || ' days')::INTERVAL,
          coupon_code = p_code,
          coupon_applied_at = NOW(),
          updated_at = NOW()
      WHERE user_id = p_user_id;

      INSERT INTO zeroed_coupon_redemptions (coupon_id, user_id) VALUES (coupon.id, p_user_id);
      UPDATE zeroed_coupons SET current_uses = current_uses + 1 WHERE id = coupon.id;

      RETURN QUERY SELECT TRUE, ('Trial extended by ' || coupon.trial_days_extension || ' days!')::TEXT, 'trialing'::TEXT;

    ELSE
      RETURN QUERY SELECT FALSE, 'Coupon type not supported'::TEXT, NULL::TEXT;
  END CASE;
END;
$$;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON zeroed_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON zeroed_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON zeroed_coupons(LOWER(code));
