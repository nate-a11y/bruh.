-- ============================================================================
-- ZEROED SPRINT 6 MIGRATIONS
-- Features: Time Entries, Reports, Enhanced Preferences, Weekly Stats
-- Status: TODO
-- ============================================================================

-- ============================================================================
-- TIME ENTRIES
-- ============================================================================

-- Time entries for manual time tracking
create table if not exists zeroed_time_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  task_id uuid references zeroed_tasks(id) on delete set null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  duration_minutes integer,
  is_manual boolean default false,
  created_at timestamptz default now()
);

alter table zeroed_time_entries enable row level security;

drop policy if exists "Users can CRUD own time_entries" on zeroed_time_entries;
create policy "Users can CRUD own time_entries" on zeroed_time_entries
  for all using (auth.uid() = user_id);

create index if not exists zeroed_time_entries_user_date_idx
  on zeroed_time_entries(user_id, start_time);
create index if not exists zeroed_time_entries_task_idx
  on zeroed_time_entries(task_id) where task_id is not null;

-- ============================================================================
-- SAVED REPORTS
-- ============================================================================

create table if not exists zeroed_saved_reports (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  report_type text not null check (report_type in ('productivity', 'time', 'goals', 'custom')),
  config jsonb not null,
  schedule text check (schedule in ('daily', 'weekly', 'monthly') or schedule is null),
  last_generated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table zeroed_saved_reports enable row level security;

drop policy if exists "Users can CRUD own reports" on zeroed_saved_reports;
create policy "Users can CRUD own reports" on zeroed_saved_reports
  for all using (auth.uid() = user_id);

-- Trigger
drop trigger if exists zeroed_saved_reports_updated_at on zeroed_saved_reports;
create trigger zeroed_saved_reports_updated_at before update on zeroed_saved_reports
  for each row execute function zeroed_handle_updated_at();

-- ============================================================================
-- ENHANCED USER PREFERENCES
-- ============================================================================

alter table zeroed_user_preferences add column if not exists
  onboarding_completed boolean default false;
alter table zeroed_user_preferences add column if not exists
  onboarding_step integer default 0;
alter table zeroed_user_preferences add column if not exists
  keyboard_shortcuts_enabled boolean default true;
alter table zeroed_user_preferences add column if not exists
  animations_enabled boolean default true;
alter table zeroed_user_preferences add column if not exists
  compact_mode boolean default false;
alter table zeroed_user_preferences add column if not exists
  start_of_week integer default 1; -- 0=Sun, 1=Mon
alter table zeroed_user_preferences add column if not exists
  daily_goal_tasks integer default 5;
alter table zeroed_user_preferences add column if not exists
  daily_goal_focus_minutes integer default 120;

-- ============================================================================
-- WEEKLY STATS (for faster aggregated queries)
-- ============================================================================

create table if not exists zeroed_weekly_stats (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  week_start date not null,
  tasks_completed integer default 0,
  tasks_created integer default 0,
  focus_minutes integer default 0,
  sessions_completed integer default 0,
  most_productive_day text,
  avg_tasks_per_day numeric(4,1) default 0,
  avg_focus_per_day numeric(5,1) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, week_start)
);

alter table zeroed_weekly_stats enable row level security;

drop policy if exists "Users can read own weekly_stats" on zeroed_weekly_stats;
create policy "Users can read own weekly_stats" on zeroed_weekly_stats
  for select using (auth.uid() = user_id);

-- Allow insert/update for the system
drop policy if exists "Users can write own weekly_stats" on zeroed_weekly_stats;
create policy "Users can write own weekly_stats" on zeroed_weekly_stats
  for all using (auth.uid() = user_id);

-- Index
create index if not exists zeroed_weekly_stats_user_week_idx
  on zeroed_weekly_stats(user_id, week_start);

-- ============================================================================
-- HELPER FUNCTION: Aggregate weekly stats
-- ============================================================================

create or replace function zeroed_aggregate_weekly_stats(
  p_user_id uuid,
  p_week_start date
)
returns void as $$
declare
  v_week_end date;
  v_tasks_completed integer;
  v_tasks_created integer;
  v_focus_minutes integer;
  v_sessions_completed integer;
  v_most_productive_day text;
begin
  v_week_end := p_week_start + interval '6 days';

  -- Aggregate from daily stats
  select
    coalesce(sum(tasks_completed), 0),
    coalesce(sum(tasks_created), 0),
    coalesce(sum(focus_minutes), 0),
    coalesce(sum(sessions_completed), 0)
  into v_tasks_completed, v_tasks_created, v_focus_minutes, v_sessions_completed
  from zeroed_daily_stats
  where user_id = p_user_id
    and date >= p_week_start
    and date <= v_week_end;

  -- Find most productive day
  select to_char(date, 'Day')
  into v_most_productive_day
  from zeroed_daily_stats
  where user_id = p_user_id
    and date >= p_week_start
    and date <= v_week_end
  order by tasks_completed desc
  limit 1;

  -- Upsert weekly stats
  insert into zeroed_weekly_stats (
    user_id, week_start, tasks_completed, tasks_created,
    focus_minutes, sessions_completed, most_productive_day,
    avg_tasks_per_day, avg_focus_per_day
  ) values (
    p_user_id, p_week_start, v_tasks_completed, v_tasks_created,
    v_focus_minutes, v_sessions_completed, trim(v_most_productive_day),
    round(v_tasks_completed::numeric / 7, 1),
    round(v_focus_minutes::numeric / 7, 1)
  )
  on conflict (user_id, week_start) do update set
    tasks_completed = excluded.tasks_completed,
    tasks_created = excluded.tasks_created,
    focus_minutes = excluded.focus_minutes,
    sessions_completed = excluded.sessions_completed,
    most_productive_day = excluded.most_productive_day,
    avg_tasks_per_day = excluded.avg_tasks_per_day,
    avg_focus_per_day = excluded.avg_focus_per_day,
    updated_at = now();
end;
$$ language plpgsql security definer;
