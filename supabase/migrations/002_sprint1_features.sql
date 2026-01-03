-- ============================================================================
-- ZEROED SPRINT 1 MIGRATIONS
-- Features: Subtasks, Tags, Recurring Tasks
-- ============================================================================

-- ============================================================================
-- SUBTASKS
-- ============================================================================

-- Add parent reference for subtasks
alter table zeroed_tasks add column if not exists parent_id uuid references zeroed_tasks(id) on delete cascade;
alter table zeroed_tasks add column if not exists is_subtask boolean default false;

-- Index for efficient subtask queries
create index if not exists zeroed_tasks_parent_idx on zeroed_tasks(parent_id) where parent_id is not null;

-- Function to count subtasks and completed subtasks
create or replace function zeroed_get_subtask_progress(task_uuid uuid)
returns table(total integer, completed integer) as $$
begin
  return query
  select
    count(*)::integer as total,
    count(*) filter (where status = 'completed')::integer as completed
  from zeroed_tasks
  where parent_id = task_uuid;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- TAGS
-- ============================================================================

-- Tags table
create table if not exists zeroed_tags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  color text default '#6366f1',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, lower(name))
);

-- Task-tag junction table
create table if not exists zeroed_task_tags (
  task_id uuid references zeroed_tasks(id) on delete cascade,
  tag_id uuid references zeroed_tags(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (task_id, tag_id)
);

-- Indexes
create index if not exists zeroed_tags_user_idx on zeroed_tags(user_id);
create index if not exists zeroed_task_tags_task_idx on zeroed_task_tags(task_id);
create index if not exists zeroed_task_tags_tag_idx on zeroed_task_tags(tag_id);

-- RLS for tags
alter table zeroed_tags enable row level security;
alter table zeroed_task_tags enable row level security;

create policy "Users can CRUD own tags" on zeroed_tags
  for all using (auth.uid() = user_id);

create policy "Users can CRUD own task_tags" on zeroed_task_tags
  for all using (
    exists (
      select 1 from zeroed_tasks
      where zeroed_tasks.id = zeroed_task_tags.task_id
      and zeroed_tasks.user_id = auth.uid()
    )
  );

-- Updated_at trigger for tags
create trigger zeroed_tags_updated_at before update on zeroed_tags
  for each row execute function zeroed_handle_updated_at();

-- ============================================================================
-- RECURRING TASKS
-- ============================================================================

-- Add recurrence fields to tasks
alter table zeroed_tasks add column if not exists is_recurring boolean default false;
alter table zeroed_tasks add column if not exists recurrence_rule jsonb;
-- recurrence_rule format:
-- {
--   "frequency": "daily" | "weekly" | "monthly" | "yearly",
--   "interval": 1,           -- every X days/weeks/months/years
--   "daysOfWeek": [1,3,5],   -- for weekly: 0=Sun, 1=Mon, etc.
--   "dayOfMonth": 15,        -- for monthly: specific date
--   "endDate": "2025-12-31", -- optional end date
--   "endAfter": 10           -- optional: end after X occurrences
-- }

alter table zeroed_tasks add column if not exists recurrence_parent_id uuid references zeroed_tasks(id) on delete set null;
alter table zeroed_tasks add column if not exists recurrence_index integer default 0;

-- Index for finding recurrence instances
create index if not exists zeroed_tasks_recurrence_parent_idx on zeroed_tasks(recurrence_parent_id) where recurrence_parent_id is not null;

-- Function to generate next occurrence date
create or replace function zeroed_next_occurrence(
  p_rule jsonb,
  p_current_date date
)
returns date as $$
declare
  v_frequency text;
  v_interval integer;
  v_next_date date;
  v_end_date date;
begin
  v_frequency := p_rule->>'frequency';
  v_interval := coalesce((p_rule->>'interval')::integer, 1);
  v_end_date := (p_rule->>'endDate')::date;

  case v_frequency
    when 'daily' then
      v_next_date := p_current_date + (v_interval || ' days')::interval;
    when 'weekly' then
      v_next_date := p_current_date + (v_interval * 7 || ' days')::interval;
    when 'monthly' then
      v_next_date := p_current_date + (v_interval || ' months')::interval;
    when 'yearly' then
      v_next_date := p_current_date + (v_interval || ' years')::interval;
    else
      v_next_date := null;
  end case;

  -- Check if past end date
  if v_end_date is not null and v_next_date > v_end_date then
    return null;
  end if;

  return v_next_date;
end;
$$ language plpgsql immutable;

-- ============================================================================
-- SAVED FILTERS (Smart Lists)
-- ============================================================================

create table if not exists zeroed_saved_filters (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  icon text default 'filter',
  color text default '#6366f1',
  filter_config jsonb not null,
  -- filter_config format:
  -- {
  --   "lists": ["uuid1", "uuid2"],     -- filter by lists (empty = all)
  --   "tags": ["uuid1", "uuid2"],      -- filter by tags (AND logic)
  --   "status": ["pending", "in_progress"],
  --   "priority": ["high", "urgent"],
  --   "dueDateRange": "today" | "week" | "overdue" | "no_date",
  --   "isRecurring": true | false | null,
  --   "hasSubtasks": true | false | null
  -- }
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table zeroed_saved_filters enable row level security;

create policy "Users can CRUD own saved_filters" on zeroed_saved_filters
  for all using (auth.uid() = user_id);

-- Trigger
create trigger zeroed_saved_filters_updated_at before update on zeroed_saved_filters
  for each row execute function zeroed_handle_updated_at();

-- ============================================================================
-- HELPER FUNCTION: Increment daily stats (updated version)
-- ============================================================================

create or replace function zeroed_increment_daily_stat(
  p_user_id uuid,
  p_date date,
  p_field text,
  p_value integer default 1
)
returns void as $$
begin
  insert into zeroed_daily_stats (user_id, date, tasks_completed, tasks_created, focus_minutes, sessions_completed, estimated_minutes, actual_minutes)
  values (p_user_id, p_date, 0, 0, 0, 0, 0, 0)
  on conflict (user_id, date) do nothing;

  execute format('update zeroed_daily_stats set %I = %I + $1, updated_at = now() where user_id = $2 and date = $3', p_field, p_field)
  using p_value, p_user_id, p_date;
end;
$$ language plpgsql security definer;
