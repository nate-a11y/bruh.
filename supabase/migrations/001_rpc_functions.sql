-- RPC function to increment daily stats safely
-- Run this in your Supabase SQL editor

create or replace function zeroed_increment_daily_stat(
  p_user_id uuid,
  p_date date,
  p_field text,
  p_value integer default 1
)
returns void as $$
begin
  -- First ensure the row exists
  insert into zeroed_daily_stats (user_id, date)
  values (p_user_id, p_date)
  on conflict (user_id, date) do nothing;

  -- Then increment the specified field
  execute format(
    'update zeroed_daily_stats set %I = coalesce(%I, 0) + $1 where user_id = $2 and date = $3',
    p_field, p_field
  )
  using p_value, p_user_id, p_date;
end;
$$ language plpgsql security definer;

-- Grant execute permission to authenticated users
grant execute on function zeroed_increment_daily_stat to authenticated;
