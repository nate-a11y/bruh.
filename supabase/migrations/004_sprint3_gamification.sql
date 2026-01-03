-- ============================================================================
-- ZEROED SPRINT 3 MIGRATIONS
-- Features: Goals, Habits, Gamification
-- Status: TODO
-- ============================================================================

-- ============================================================================
-- GOALS
-- ============================================================================

create table if not exists zeroed_goals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  target_type text not null check (target_type in (
    'tasks_completed',
    'focus_minutes',
    'focus_sessions',
    'streak_days',
    'custom'
  )),
  target_value integer not null,
  current_value integer default 0,
  period text not null check (period in ('daily', 'weekly', 'monthly', 'yearly', 'total')),
  start_date date not null default current_date,
  end_date date,
  status text default 'active' check (status in ('active', 'completed', 'failed', 'paused')),
  completed_at timestamptz,
  color text default '#6366f1',
  icon text default 'target',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table zeroed_goals enable row level security;

drop policy if exists "Users can CRUD own goals" on zeroed_goals;
create policy "Users can CRUD own goals" on zeroed_goals
  for all using (auth.uid() = user_id);

-- Indexes
create index if not exists zeroed_goals_user_status_idx on zeroed_goals(user_id, status);
create index if not exists zeroed_goals_period_idx on zeroed_goals(user_id, period, start_date);

-- Trigger
drop trigger if exists zeroed_goals_updated_at on zeroed_goals;
create trigger zeroed_goals_updated_at before update on zeroed_goals
  for each row execute function zeroed_handle_updated_at();

-- ============================================================================
-- HABITS
-- ============================================================================

create table if not exists zeroed_habits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  icon text default 'circle-check',
  color text default '#6366f1',
  frequency text not null default 'daily' check (frequency in ('daily', 'weekdays', 'weekends', 'custom')),
  frequency_days integer[] default array[0,1,2,3,4,5,6], -- 0=Sun, 6=Sat
  reminder_time time,
  target_per_day integer default 1, -- For habits you can do multiple times
  streak_current integer default 0,
  streak_best integer default 0,
  total_completions integer default 0,
  is_archived boolean default false,
  position integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists zeroed_habit_logs (
  id uuid primary key default uuid_generate_v4(),
  habit_id uuid references zeroed_habits(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  completed_count integer default 1,
  notes text,
  created_at timestamptz default now(),
  unique(habit_id, date)
);

-- RLS
alter table zeroed_habits enable row level security;
alter table zeroed_habit_logs enable row level security;

drop policy if exists "Users can CRUD own habits" on zeroed_habits;
create policy "Users can CRUD own habits" on zeroed_habits
  for all using (auth.uid() = user_id);

drop policy if exists "Users can CRUD own habit_logs" on zeroed_habit_logs;
create policy "Users can CRUD own habit_logs" on zeroed_habit_logs
  for all using (auth.uid() = user_id);

-- Indexes
create index if not exists zeroed_habits_user_idx on zeroed_habits(user_id, is_archived);
create index if not exists zeroed_habit_logs_habit_date_idx on zeroed_habit_logs(habit_id, date);
create index if not exists zeroed_habit_logs_user_date_idx on zeroed_habit_logs(user_id, date);

-- Trigger
drop trigger if exists zeroed_habits_updated_at on zeroed_habits;
create trigger zeroed_habits_updated_at before update on zeroed_habits
  for each row execute function zeroed_handle_updated_at();

-- ============================================================================
-- GAMIFICATION
-- ============================================================================

-- Add gamification fields to user preferences
alter table zeroed_user_preferences add column if not exists points integer default 0;
alter table zeroed_user_preferences add column if not exists level integer default 1;
alter table zeroed_user_preferences add column if not exists xp_to_next_level integer default 100;
alter table zeroed_user_preferences add column if not exists gamification_enabled boolean default true;

-- Achievements table
create table if not exists zeroed_achievements (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  achievement_type text not null,
  achievement_tier integer default 1, -- For tiered achievements (bronze, silver, gold)
  earned_at timestamptz default now(),
  unique(user_id, achievement_type, achievement_tier)
);

-- Points history for tracking
create table if not exists zeroed_points_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  points integer not null,
  reason text not null, -- 'task_completed', 'focus_session', 'streak_bonus', 'achievement', etc.
  reference_id uuid, -- Optional: task_id, session_id, etc.
  created_at timestamptz default now()
);

-- RLS
alter table zeroed_achievements enable row level security;
alter table zeroed_points_history enable row level security;

drop policy if exists "Users can CRUD own achievements" on zeroed_achievements;
create policy "Users can CRUD own achievements" on zeroed_achievements
  for all using (auth.uid() = user_id);

drop policy if exists "Users can CRUD own points_history" on zeroed_points_history;
create policy "Users can CRUD own points_history" on zeroed_points_history
  for all using (auth.uid() = user_id);

-- Indexes
create index if not exists zeroed_achievements_user_idx on zeroed_achievements(user_id);
create index if not exists zeroed_points_history_user_idx on zeroed_points_history(user_id, created_at);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to add points and check for level up
create or replace function zeroed_add_points(
  p_user_id uuid,
  p_points integer,
  p_reason text,
  p_reference_id uuid default null
)
returns json as $$
declare
  v_current_points integer;
  v_current_level integer;
  v_xp_needed integer;
  v_leveled_up boolean := false;
  v_new_level integer;
begin
  -- Get current stats
  select points, level, xp_to_next_level
  into v_current_points, v_current_level, v_xp_needed
  from zeroed_user_preferences
  where user_id = p_user_id;

  -- Add points
  v_current_points := coalesce(v_current_points, 0) + p_points;

  -- Check for level up (XP needed increases by 50% each level)
  v_new_level := coalesce(v_current_level, 1);
  v_xp_needed := coalesce(v_xp_needed, 100);

  while v_current_points >= v_xp_needed loop
    v_current_points := v_current_points - v_xp_needed;
    v_new_level := v_new_level + 1;
    v_xp_needed := floor(v_xp_needed * 1.5);
    v_leveled_up := true;
  end loop;

  -- Update user preferences
  update zeroed_user_preferences
  set
    points = v_current_points,
    level = v_new_level,
    xp_to_next_level = v_xp_needed,
    updated_at = now()
  where user_id = p_user_id;

  -- Log points
  insert into zeroed_points_history (user_id, points, reason, reference_id)
  values (p_user_id, p_points, p_reason, p_reference_id);

  return json_build_object(
    'points', v_current_points,
    'level', v_new_level,
    'xp_to_next_level', v_xp_needed,
    'leveled_up', v_leveled_up,
    'points_earned', p_points
  );
end;
$$ language plpgsql security definer;

-- Function to update habit streak
create or replace function zeroed_update_habit_streak(p_habit_id uuid)
returns void as $$
declare
  v_user_id uuid;
  v_current_streak integer := 0;
  v_check_date date := current_date;
  v_frequency_days integer[];
  v_has_log boolean;
begin
  -- Get habit info
  select user_id, frequency_days into v_user_id, v_frequency_days
  from zeroed_habits where id = p_habit_id;

  -- Count consecutive days
  loop
    -- Check if this day should be tracked
    if extract(dow from v_check_date)::integer = any(v_frequency_days) then
      -- Check if completed
      select exists(
        select 1 from zeroed_habit_logs
        where habit_id = p_habit_id and date = v_check_date
      ) into v_has_log;

      if v_has_log then
        v_current_streak := v_current_streak + 1;
        v_check_date := v_check_date - interval '1 day';
      else
        exit;
      end if;
    else
      -- Skip non-tracking days
      v_check_date := v_check_date - interval '1 day';
    end if;

    -- Safety limit
    if v_check_date < current_date - interval '365 days' then
      exit;
    end if;
  end loop;

  -- Update streak
  update zeroed_habits
  set
    streak_current = v_current_streak,
    streak_best = greatest(streak_best, v_current_streak),
    updated_at = now()
  where id = p_habit_id;
end;
$$ language plpgsql security definer;

-- Function to check and award achievements
create or replace function zeroed_check_achievements(p_user_id uuid)
returns json[] as $$
declare
  v_new_achievements json[] := array[]::json[];
  v_tasks_completed integer;
  v_focus_sessions integer;
  v_focus_minutes integer;
  v_streak integer;
begin
  -- Get stats
  select
    coalesce(sum(tasks_completed), 0),
    coalesce(sum(sessions_completed), 0),
    coalesce(sum(focus_minutes), 0)
  into v_tasks_completed, v_focus_sessions, v_focus_minutes
  from zeroed_daily_stats
  where user_id = p_user_id;

  -- Check "Task Master" achievements
  if v_tasks_completed >= 1 then
    insert into zeroed_achievements (user_id, achievement_type, achievement_tier)
    values (p_user_id, 'task_master', 1)
    on conflict do nothing;
    if found then
      v_new_achievements := array_append(v_new_achievements,
        json_build_object('type', 'task_master', 'tier', 1, 'name', 'First Blood'));
    end if;
  end if;

  if v_tasks_completed >= 100 then
    insert into zeroed_achievements (user_id, achievement_type, achievement_tier)
    values (p_user_id, 'task_master', 2)
    on conflict do nothing;
    if found then
      v_new_achievements := array_append(v_new_achievements,
        json_build_object('type', 'task_master', 'tier', 2, 'name', 'Centurion'));
    end if;
  end if;

  if v_tasks_completed >= 1000 then
    insert into zeroed_achievements (user_id, achievement_type, achievement_tier)
    values (p_user_id, 'task_master', 3)
    on conflict do nothing;
    if found then
      v_new_achievements := array_append(v_new_achievements,
        json_build_object('type', 'task_master', 'tier', 3, 'name', 'Task Titan'));
    end if;
  end if;

  -- Check "Focus" achievements
  if v_focus_sessions >= 1 then
    insert into zeroed_achievements (user_id, achievement_type, achievement_tier)
    values (p_user_id, 'focus_master', 1)
    on conflict do nothing;
  end if;

  if v_focus_sessions >= 50 then
    insert into zeroed_achievements (user_id, achievement_type, achievement_tier)
    values (p_user_id, 'focus_master', 2)
    on conflict do nothing;
  end if;

  if v_focus_minutes >= 1000 then
    insert into zeroed_achievements (user_id, achievement_type, achievement_tier)
    values (p_user_id, 'focus_master', 3)
    on conflict do nothing;
  end if;

  return v_new_achievements;
end;
$$ language plpgsql security definer;
