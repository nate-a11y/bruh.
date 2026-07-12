-- Phase 2 security hardening.
-- S3: SECURITY DEFINER functions were EXECUTE-able by anon/public, and they act on a
--     caller-supplied p_user_id -> unauthenticated cross-user tampering via PostgREST RPC.
--     Revoke from PUBLIC + anon; keep authenticated + service_role. (Trigger functions get
--     no grant; they run as definer via their trigger.) Deeper fix (guard p_user_id against
--     auth.uid() inside each body) is a follow-up that needs per-function testing.
-- S7: template "FOR ALL" policies let any user UPDATE/DELETE any public/system template.
--     Split into public-read + owner-only write.
-- Idempotent.

-- ============================================================================
-- S3: lock down SECURITY DEFINER function execution
-- ============================================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig,
           (p.prorettype = 'trigger'::regtype) AS is_trigger
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    IF NOT r.is_trigger THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- S7: template policies — public read, owner-only writes
-- ============================================================================
-- Task templates
DROP POLICY IF EXISTS "Users can CRUD own templates" ON zeroed_task_templates;
DROP POLICY IF EXISTS "View public or own task templates" ON zeroed_task_templates;
DROP POLICY IF EXISTS "Insert own task templates" ON zeroed_task_templates;
DROP POLICY IF EXISTS "Update own task templates" ON zeroed_task_templates;
DROP POLICY IF EXISTS "Delete own task templates" ON zeroed_task_templates;
CREATE POLICY "View public or own task templates" ON zeroed_task_templates
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Insert own task templates" ON zeroed_task_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own task templates" ON zeroed_task_templates
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own task templates" ON zeroed_task_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Project templates
DROP POLICY IF EXISTS "Users can CRUD project templates" ON zeroed_project_templates;
DROP POLICY IF EXISTS "View public or own project templates" ON zeroed_project_templates;
DROP POLICY IF EXISTS "Insert own project templates" ON zeroed_project_templates;
DROP POLICY IF EXISTS "Update own project templates" ON zeroed_project_templates;
DROP POLICY IF EXISTS "Delete own project templates" ON zeroed_project_templates;
CREATE POLICY "View public or own project templates" ON zeroed_project_templates
  FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Insert own project templates" ON zeroed_project_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own project templates" ON zeroed_project_templates
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Delete own project templates" ON zeroed_project_templates
  FOR DELETE USING (auth.uid() = user_id);
