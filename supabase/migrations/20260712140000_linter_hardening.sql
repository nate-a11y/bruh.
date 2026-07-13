-- Supabase linter hardening.
-- 1. function_search_path_mutable: pin search_path on every public function so a
--    SECURITY DEFINER function can't be hijacked via search_path manipulation.
-- 2. authenticated_security_definer_function_executable: revoke the trigger
--    functions from all roles (they run via triggers, never via RPC). The
--    remaining SECURITY DEFINER functions the app calls keep `authenticated`
--    intentionally — they carry auth.uid() guards.
-- 3. zeroed_task_activity had RLS enabled but no policy (deny-all) — add
--    member-scoped read + owner insert so the team activity feed works.
-- Idempotent.

-- ============================================================================
-- 1. Pin search_path on all public functions
-- ============================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

-- ============================================================================
-- 2. Trigger functions should not be callable via the REST RPC surface
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.zeroed_handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.zeroed_handle_updated_at() FROM PUBLIC, anon, authenticated;

-- ============================================================================
-- 3. zeroed_task_activity policies (team-scoped)
-- ============================================================================
DROP POLICY IF EXISTS "Members view team task activity" ON zeroed_task_activity;
CREATE POLICY "Members view team task activity" ON zeroed_task_activity
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM zeroed_team_tasks t
      JOIN zeroed_team_projects p ON p.id = t.project_id
      WHERE p.team_id IN (
        SELECT team_id FROM zeroed_team_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Members log team task activity" ON zeroed_task_activity;
CREATE POLICY "Members log team task activity" ON zeroed_task_activity
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND task_id IN (
      SELECT t.id FROM zeroed_team_tasks t
      JOIN zeroed_team_projects p ON p.id = t.project_id
      WHERE p.team_id IN (
        SELECT team_id FROM zeroed_team_members WHERE user_id = auth.uid()
      )
    )
  );
