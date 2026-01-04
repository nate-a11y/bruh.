-- Task Dependencies Migration
-- Allows tasks to have "blocked by" relationships

-- Create task dependencies table
CREATE TABLE IF NOT EXISTS zeroed_task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES zeroed_tasks(id) ON DELETE CASCADE,
  depends_on_id UUID NOT NULL REFERENCES zeroed_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure no duplicate dependencies
  UNIQUE(task_id, depends_on_id),

  -- Prevent self-referencing
  CHECK (task_id != depends_on_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON zeroed_task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON zeroed_task_dependencies(depends_on_id);

-- RLS policies
ALTER TABLE zeroed_task_dependencies ENABLE ROW LEVEL SECURITY;

-- Users can only see dependencies for their own tasks
CREATE POLICY "Users can view own task dependencies" ON zeroed_task_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM zeroed_tasks
      WHERE zeroed_tasks.id = zeroed_task_dependencies.task_id
      AND zeroed_tasks.user_id = auth.uid()
    )
  );

-- Users can only create dependencies for their own tasks
CREATE POLICY "Users can create own task dependencies" ON zeroed_task_dependencies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM zeroed_tasks
      WHERE zeroed_tasks.id = task_id
      AND zeroed_tasks.user_id = auth.uid()
    ) AND
    EXISTS (
      SELECT 1 FROM zeroed_tasks
      WHERE zeroed_tasks.id = depends_on_id
      AND zeroed_tasks.user_id = auth.uid()
    )
  );

-- Users can only delete dependencies for their own tasks
CREATE POLICY "Users can delete own task dependencies" ON zeroed_task_dependencies
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM zeroed_tasks
      WHERE zeroed_tasks.id = zeroed_task_dependencies.task_id
      AND zeroed_tasks.user_id = auth.uid()
    )
  );

-- Activity Time Tracking table
CREATE TABLE IF NOT EXISTS zeroed_activity_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES zeroed_tasks(id) ON DELETE SET NULL,

  -- Activity metadata
  activity_type TEXT NOT NULL DEFAULT 'focus', -- 'focus', 'break', 'meeting', 'admin', 'learning', 'creative'
  title TEXT,

  -- Time tracking
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER, -- calculated when session ends

  -- Productivity metrics
  is_productive BOOLEAN DEFAULT true,
  focus_score INTEGER, -- 0-100, calculated based on interruptions
  interruptions INTEGER DEFAULT 0,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for activity sessions
CREATE INDEX IF NOT EXISTS idx_activity_sessions_user ON zeroed_activity_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_date ON zeroed_activity_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_activity_sessions_task ON zeroed_activity_sessions(task_id);

-- RLS for activity sessions
ALTER TABLE zeroed_activity_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own activity sessions" ON zeroed_activity_sessions
  FOR ALL USING (user_id = auth.uid());

-- Blocked sites/apps for focus mode
CREATE TABLE IF NOT EXISTS zeroed_blocked_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Blocking config
  pattern TEXT NOT NULL, -- domain pattern like "twitter.com", "*.reddit.com"
  name TEXT NOT NULL, -- friendly name
  category TEXT DEFAULT 'social', -- 'social', 'news', 'entertainment', 'shopping', 'other'
  is_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for blocked sites
CREATE INDEX IF NOT EXISTS idx_blocked_sites_user ON zeroed_blocked_sites(user_id);

-- RLS for blocked sites
ALTER TABLE zeroed_blocked_sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own blocked sites" ON zeroed_blocked_sites
  FOR ALL USING (user_id = auth.uid());

-- Insert default blocked sites for new users (trigger)
CREATE OR REPLACE FUNCTION insert_default_blocked_sites()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO zeroed_blocked_sites (user_id, pattern, name, category) VALUES
    (NEW.id, 'twitter.com', 'Twitter/X', 'social'),
    (NEW.id, 'x.com', 'Twitter/X', 'social'),
    (NEW.id, 'facebook.com', 'Facebook', 'social'),
    (NEW.id, 'instagram.com', 'Instagram', 'social'),
    (NEW.id, 'reddit.com', 'Reddit', 'social'),
    (NEW.id, 'tiktok.com', 'TikTok', 'social'),
    (NEW.id, 'youtube.com', 'YouTube', 'entertainment'),
    (NEW.id, 'netflix.com', 'Netflix', 'entertainment'),
    (NEW.id, 'news.ycombinator.com', 'Hacker News', 'news');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_user_created_blocked_sites') THEN
    CREATE TRIGGER on_user_created_blocked_sites
      AFTER INSERT ON auth.users
      FOR EACH ROW
      EXECUTE FUNCTION insert_default_blocked_sites();
  END IF;
END $$;
