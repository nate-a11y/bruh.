-- Public feature-voting roadmap (Canny-style). Users submit requests, upvote,
-- and watch status; admins set status.

CREATE TABLE IF NOT EXISTS zeroed_roadmap_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'under_review', -- under_review | planned | in_progress | done | declined
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zeroed_roadmap_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES zeroed_roadmap_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_roadmap_votes_item ON zeroed_roadmap_votes (item_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_votes_user ON zeroed_roadmap_votes (user_id);

ALTER TABLE zeroed_roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeroed_roadmap_votes ENABLE ROW LEVEL SECURITY;

-- Items: any signed-in user can read; submit their own. Status changes/edits go
-- through the service role (admin API).
DROP POLICY IF EXISTS "read roadmap items" ON zeroed_roadmap_items;
CREATE POLICY "read roadmap items" ON zeroed_roadmap_items
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "submit roadmap items" ON zeroed_roadmap_items;
CREATE POLICY "submit roadmap items" ON zeroed_roadmap_items
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- Votes: users manage their own vote rows. Counts are read via the service role.
DROP POLICY IF EXISTS "cast roadmap vote" ON zeroed_roadmap_votes;
CREATE POLICY "cast roadmap vote" ON zeroed_roadmap_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "remove roadmap vote" ON zeroed_roadmap_votes;
CREATE POLICY "remove roadmap vote" ON zeroed_roadmap_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());
