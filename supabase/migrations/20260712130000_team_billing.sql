-- Team per-seat billing. Owner pays for a subscription whose quantity = number
-- of team members; every member of an actively-subscribed team gets Pro access.

-- ============================================================================
-- Billing state on the team
-- ============================================================================
ALTER TABLE zeroed_teams
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS seats INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_teams_stripe_customer ON zeroed_teams(stripe_customer_id);

-- ============================================================================
-- Does this user get Pro via an actively-subscribed team they belong to?
-- SECURITY DEFINER so it can read teams/members regardless of the caller's RLS.
-- Guarded to the caller's own id.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.zeroed_user_has_team_access(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized to act on another user';
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM zeroed_team_members m
    JOIN zeroed_teams t ON t.id = m.team_id
    WHERE m.user_id = p_user_id
      AND t.subscription_status IN ('active', 'trialing')
      AND (t.current_period_end IS NULL OR t.current_period_end + INTERVAL '3 days' > NOW())
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.zeroed_user_has_team_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.zeroed_user_has_team_access(uuid) TO authenticated, service_role;
