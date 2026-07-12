-- Phase 1 billing hardening.
-- B5: webhook idempotency store (dedupe Stripe retries / out-of-order delivery).
-- B6: cap the past_due "grace period" so a failed card doesn't grant access forever.
-- Idempotent.

-- ============================================================================
-- B5: processed Stripe events (service-role only)
-- ============================================================================
CREATE TABLE IF NOT EXISTS zeroed_stripe_events (
  event_id TEXT PRIMARY KEY,
  type TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE zeroed_stripe_events ENABLE ROW LEVEL SECURITY;
-- No policies: only the service-role client (which bypasses RLS) writes here.
REVOKE ALL ON TABLE zeroed_stripe_events FROM anon, authenticated;

-- ============================================================================
-- B6: cap past_due grace at 7 days past current_period_end
-- ============================================================================
CREATE OR REPLACE FUNCTION public.zeroed_check_subscription_access(p_user_id uuid)
 RETURNS TABLE(has_access boolean, status text, days_remaining integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
        UPDATE zeroed_subscriptions SET status = 'canceled' WHERE user_id = p_user_id;
        RETURN QUERY SELECT FALSE, 'trial_expired'::TEXT, 0;
      END IF;
    WHEN 'past_due' THEN
      -- Bounded grace: access for up to 7 days after the period end, then deny.
      IF sub.current_period_end IS NOT NULL
         AND sub.current_period_end + INTERVAL '7 days' <= NOW() THEN
        RETURN QUERY SELECT FALSE, 'past_due'::TEXT, 0;
      ELSE
        RETURN QUERY SELECT TRUE, 'past_due'::TEXT,
          GREATEST(0, EXTRACT(DAY FROM
            (COALESCE(sub.current_period_end, NOW()) + INTERVAL '7 days') - NOW()))::INTEGER;
      END IF;
    ELSE
      RETURN QUERY SELECT FALSE, sub.status, 0;
  END CASE;
END;
$function$;

-- Keep the lockdown from the previous migration (CREATE OR REPLACE preserves grants,
-- but re-assert to be safe).
REVOKE EXECUTE ON FUNCTION public.zeroed_check_subscription_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zeroed_check_subscription_access(uuid) TO authenticated, service_role;
