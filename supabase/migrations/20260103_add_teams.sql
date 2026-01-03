-- Teams/Workspaces
CREATE TABLE IF NOT EXISTS zeroed_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team members
CREATE TABLE IF NOT EXISTS zeroed_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES zeroed_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  display_name TEXT,
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Team projects (shared lists)
CREATE TABLE IF NOT EXISTS zeroed_team_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES zeroed_teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'folder',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  position INTEGER DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Team tasks (extends regular tasks with team features)
CREATE TABLE IF NOT EXISTS zeroed_team_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES zeroed_teams(id) ON DELETE CASCADE,
  project_id UUID REFERENCES zeroed_team_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'review', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  due_date DATE,
  due_time TIME,
  estimated_minutes INTEGER DEFAULT 30,
  actual_minutes INTEGER DEFAULT 0,
  position INTEGER DEFAULT 0,
  labels TEXT[] DEFAULT '{}',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Task comments
CREATE TABLE IF NOT EXISTS zeroed_task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES zeroed_team_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[] DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Task activity log
CREATE TABLE IF NOT EXISTS zeroed_task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES zeroed_team_tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'created', 'updated', 'assigned', 'commented', 'completed', etc.
  changes JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Team invitations
CREATE TABLE IF NOT EXISTS zeroed_team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES zeroed_teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add email_task fields to user preferences
ALTER TABLE zeroed_user_preferences
ADD COLUMN IF NOT EXISTS email_task_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email_task_enabled BOOLEAN DEFAULT false;

-- Email logs for email-to-task
CREATE TABLE IF NOT EXISTS zeroed_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES zeroed_tasks(id) ON DELETE SET NULL,
  from_email TEXT NOT NULL,
  subject TEXT,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- Add source field to tasks
ALTER TABLE zeroed_tasks
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_members_user ON zeroed_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON zeroed_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_assignee ON zeroed_team_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_team_tasks_project ON zeroed_team_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task ON zeroed_task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON zeroed_task_activity(task_id);

-- RLS Policies
ALTER TABLE zeroed_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeroed_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeroed_team_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeroed_team_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeroed_task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeroed_task_activity ENABLE ROW LEVEL SECURITY;

-- Team policies: users can see teams they're members of
CREATE POLICY "Users can view teams they belong to" ON zeroed_teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM zeroed_team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Owners can update their teams" ON zeroed_teams
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can create teams" ON zeroed_teams
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Team member policies
CREATE POLICY "Members can view team members" ON zeroed_team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM zeroed_team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage members" ON zeroed_team_members
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM zeroed_team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Project policies
CREATE POLICY "Members can view projects" ON zeroed_team_projects
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM zeroed_team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can manage projects" ON zeroed_team_projects
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM zeroed_team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- Task policies
CREATE POLICY "Members can view tasks" ON zeroed_team_tasks
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM zeroed_team_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members can manage tasks" ON zeroed_team_tasks
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM zeroed_team_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  );

-- Comment policies
CREATE POLICY "Members can view comments" ON zeroed_task_comments
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM zeroed_team_tasks WHERE team_id IN (
        SELECT team_id FROM zeroed_team_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Members can add comments" ON zeroed_task_comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can edit own comments" ON zeroed_task_comments
  FOR UPDATE USING (user_id = auth.uid());
