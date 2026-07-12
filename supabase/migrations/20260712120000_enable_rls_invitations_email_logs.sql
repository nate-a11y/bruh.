-- Phase 0 security fix: enable RLS on the two tables that shipped with it disabled.
-- Both were readable/writable via the public anon key (data leak + forged invites).
-- Tables are empty in prod at time of writing, so this is additive and zero-risk.
-- Idempotent: safe to re-run.

-- ============================================================================
-- zeroed_team_invitations  (accessed via the authenticated user client)
-- ============================================================================
ALTER TABLE zeroed_team_invitations ENABLE ROW LEVEL SECURITY;

-- Team owners/admins can create, view, and revoke invitations for their team.
DROP POLICY IF EXISTS "Admins manage team invitations" ON zeroed_team_invitations;
CREATE POLICY "Admins manage team invitations" ON zeroed_team_invitations
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM zeroed_team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- The invited person can see and accept an invitation addressed to their email.
DROP POLICY IF EXISTS "Invitee can view own invitation" ON zeroed_team_invitations;
CREATE POLICY "Invitee can view own invitation" ON zeroed_team_invitations
  FOR SELECT USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Invitee can accept own invitation" ON zeroed_team_invitations;
CREATE POLICY "Invitee can accept own invitation" ON zeroed_team_invitations
  FOR UPDATE USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

-- ============================================================================
-- zeroed_email_logs  (written only by the service-role client, which bypasses RLS)
-- ============================================================================
ALTER TABLE zeroed_email_logs ENABLE ROW LEVEL SECURITY;

-- A user can read their own email-to-task logs. Inserts happen via service role.
DROP POLICY IF EXISTS "Users view own email logs" ON zeroed_email_logs;
CREATE POLICY "Users view own email logs" ON zeroed_email_logs
  FOR SELECT USING (user_id = auth.uid());
