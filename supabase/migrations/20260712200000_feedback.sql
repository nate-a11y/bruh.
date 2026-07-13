-- In-app user feedback (bug reports, ideas, general). Submitted from a dialog in
-- the app, emailed to the owner, and surfaced in the admin console.

CREATE TABLE IF NOT EXISTS zeroed_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  category TEXT NOT NULL DEFAULT 'other', -- bug | idea | other
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',      -- new | reviewed | done
  page TEXT,                               -- where it was sent from
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created ON zeroed_feedback (created_at DESC);

ALTER TABLE zeroed_feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own feedback; reads/updates are
-- service-role only (admin console). No select policy = users cannot read the
-- table back.
DROP POLICY IF EXISTS "Users submit feedback" ON zeroed_feedback;
CREATE POLICY "Users submit feedback" ON zeroed_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
