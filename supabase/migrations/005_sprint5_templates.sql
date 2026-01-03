-- ============================================================================
-- ZEROED SPRINT 5 MIGRATIONS
-- Features: Task Templates, Project Templates
-- Status: TODO
-- ============================================================================

-- ============================================================================
-- TASK TEMPLATES
-- ============================================================================

create table if not exists zeroed_task_templates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  icon text default 'file-text',
  is_public boolean default false,
  use_count integer default 0,
  task_data jsonb not null,
  subtasks jsonb,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table zeroed_task_templates enable row level security;

drop policy if exists "Users can CRUD own templates" on zeroed_task_templates;
create policy "Users can CRUD own templates" on zeroed_task_templates
  for all using (auth.uid() = user_id or is_public = true);

-- Indexes
create index if not exists zeroed_task_templates_user_idx on zeroed_task_templates(user_id);
create index if not exists zeroed_task_templates_public_idx on zeroed_task_templates(is_public) where is_public = true;

-- Trigger
drop trigger if exists zeroed_task_templates_updated_at on zeroed_task_templates;
create trigger zeroed_task_templates_updated_at before update on zeroed_task_templates
  for each row execute function zeroed_handle_updated_at();

-- ============================================================================
-- PROJECT TEMPLATES
-- ============================================================================

create table if not exists zeroed_project_templates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  icon text default 'folder',
  color text default '#6366f1',
  category text,
  is_public boolean default false,
  use_count integer default 0,
  list_data jsonb not null,
  tasks jsonb not null,
  created_at timestamptz default now()
);

alter table zeroed_project_templates enable row level security;

drop policy if exists "Users can CRUD project templates" on zeroed_project_templates;
create policy "Users can CRUD project templates" on zeroed_project_templates
  for all using (auth.uid() = user_id or is_public = true);

-- Indexes
create index if not exists zeroed_project_templates_user_idx on zeroed_project_templates(user_id);
create index if not exists zeroed_project_templates_public_idx on zeroed_project_templates(is_public) where is_public = true;
create index if not exists zeroed_project_templates_category_idx on zeroed_project_templates(category);

-- ============================================================================
-- SEED PUBLIC PROJECT TEMPLATES
-- ============================================================================

insert into zeroed_project_templates (user_id, name, description, icon, category, is_public, list_data, tasks) values
(null, 'Weekly Review', 'End-of-week reflection and planning', 'calendar', 'productivity', true,
  '{"name": "Weekly Review", "color": "#6366f1"}',
  '[{"title": "Review completed tasks", "estimated_minutes": 15},
    {"title": "Review incomplete tasks", "estimated_minutes": 10},
    {"title": "Check calendar for next week", "estimated_minutes": 10},
    {"title": "Set top 3 priorities for next week", "estimated_minutes": 15}]'
),
(null, 'Blog Post', 'Complete blog post workflow', 'pen-tool', 'content', true,
  '{"name": "Blog Post", "color": "#10b981"}',
  '[{"title": "Research topic and outline", "estimated_minutes": 30},
    {"title": "Write first draft", "estimated_minutes": 60},
    {"title": "Add images and formatting", "estimated_minutes": 20},
    {"title": "Edit and proofread", "estimated_minutes": 30},
    {"title": "Publish and share", "estimated_minutes": 15}]'
),
(null, 'Sprint Planning', 'Agile sprint planning workflow', 'git-branch', 'engineering', true,
  '{"name": "Sprint Planning", "color": "#f59e0b"}',
  '[{"title": "Review backlog", "estimated_minutes": 30},
    {"title": "Estimate stories", "estimated_minutes": 45},
    {"title": "Assign sprint capacity", "estimated_minutes": 15},
    {"title": "Define sprint goal", "estimated_minutes": 15},
    {"title": "Update board", "estimated_minutes": 10}]'
),
(null, 'Product Launch', 'Product launch checklist', 'rocket', 'marketing', true,
  '{"name": "Product Launch", "color": "#ef4444"}',
  '[{"title": "Finalize launch date", "estimated_minutes": 30},
    {"title": "Prepare press release", "estimated_minutes": 60},
    {"title": "Create social media content", "estimated_minutes": 45},
    {"title": "Set up analytics tracking", "estimated_minutes": 30},
    {"title": "Brief support team", "estimated_minutes": 30},
    {"title": "Execute launch", "estimated_minutes": 60}]'
)
on conflict do nothing;
