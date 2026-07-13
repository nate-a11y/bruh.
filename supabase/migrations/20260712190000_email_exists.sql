-- Lets the magic-link server action check whether an email already has an
-- account, so an unknown email routes to signup instead of silently creating
-- one. SECURITY DEFINER to read auth.users; callable only by the service role.
CREATE OR REPLACE FUNCTION zeroed_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)
  );
$$;

REVOKE ALL ON FUNCTION zeroed_email_exists(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION zeroed_email_exists(text) TO service_role;
