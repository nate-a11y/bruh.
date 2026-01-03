-- ============================================================================
-- ZEROED SPRINT 2 MIGRATIONS
-- Features: View preferences, Kanban columns
-- Status: TODO
-- ============================================================================

-- User view preferences per list
create table if not exists zeroed_view_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  list_id uuid references zeroed_lists(id) on delete cascade,
  view_type text default 'list' check (view_type in ('list', 'kanban', 'calendar', 'table')),
  kanban_group_by text default 'status' check (kanban_group_by in ('status', 'priority', 'list')),
  calendar_color_by text default 'list' check (calendar_color_by in ('list', 'priority')),
  table_columns text[] default array['title', 'status', 'priority', 'due_date', 'estimated_minutes'],
  table_sort_column text default 'due_date',
  table_sort_direction text default 'asc',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, list_id)
);

-- Global view preference (when list_id is null)
create unique index if not exists zeroed_view_prefs_global_unique
  on zeroed_view_preferences(user_id) where list_id is null;

-- RLS
alter table zeroed_view_preferences enable row level security;

drop policy if exists "Users can CRUD own view_preferences" on zeroed_view_preferences;
create policy "Users can CRUD own view_preferences" on zeroed_view_preferences
  for all using (auth.uid() = user_id);

-- Trigger
drop trigger if exists zeroed_view_preferences_updated_at on zeroed_view_preferences;
create trigger zeroed_view_preferences_updated_at before update on zeroed_view_preferences
  for each row execute function zeroed_handle_updated_at();

-- Add position_in_status for kanban ordering within columns
alter table zeroed_tasks add column if not exists position_in_status integer default 0;

-- Index for kanban queries
create index if not exists zeroed_tasks_status_position_idx
  on zeroed_tasks(user_id, status, position_in_status);
