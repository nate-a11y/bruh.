-- Phase 2 (S3-deeper): guard p_user_id in SECURITY DEFINER RPCs.
-- Blocks an authenticated user from acting on another user's id; service-role
-- calls (auth.uid() IS NULL) are unaffected. Regenerated from live defs.

CREATE OR REPLACE FUNCTION public.zeroed_add_points(p_user_id uuid, p_points integer, p_reason text, p_reference_id uuid DEFAULT NULL::uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
                                                                                                                                                      declare
                                                                                                                                                        v_current_points integer;
                                                                                                                                                          v_current_level integer;
                                                                                                                                                            v_xp_needed integer;
                                                                                                                                                              v_leveled_up boolean := false;
                                                                                                                                                                v_new_level integer;
                                                                                                                                                                begin
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized to act on another user';
  END IF;
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
                                                                                                                                                                                                                                                              $function$
;

CREATE OR REPLACE FUNCTION public.zeroed_aggregate_weekly_stats(p_user_id uuid, p_week_start date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_week_end date;
  v_tasks_completed integer;
  v_tasks_created integer;
  v_focus_minutes integer;
  v_sessions_completed integer;
  v_most_productive_day text;
begin
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized to act on another user';
  END IF;
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
$function$
;

CREATE OR REPLACE FUNCTION public.zeroed_check_achievements(p_user_id uuid)
 RETURNS json[]
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
                                                                                                                                                                                                                                                                                                                                                                                                                                  declare
                                                                                                                                                                                                                                                                                                                                                                                                                                    v_new_achievements json[] := array[]::json[];
                                                                                                                                                                                                                                                                                                                                                                                                                                      v_tasks_completed integer;
                                                                                                                                                                                                                                                                                                                                                                                                                                        v_focus_sessions integer;
                                                                                                                                                                                                                                                                                                                                                                                                                                          v_focus_minutes integer;
                                                                                                                                                                                                                                                                                                                                                                                                                                            v_streak integer;
                                                                                                                                                                                                                                                                                                                                                                                                                                            begin
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized to act on another user';
  END IF;
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
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          $function$
;

CREATE OR REPLACE FUNCTION public.zeroed_increment_daily_stat(p_user_id uuid, p_date date, p_field text, p_value integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized to act on another user';
  END IF;
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
$function$
;

CREATE OR REPLACE FUNCTION public.zeroed_redeem_coupon(p_user_id uuid, p_code text)
 RETURNS TABLE(success boolean, message text, new_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  coupon RECORD;
  sub RECORD;
BEGIN
  IF auth.uid() IS NOT NULL AND p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'not authorized to act on another user';
  END IF;
  -- Find coupon
  SELECT * INTO coupon FROM zeroed_coupons
  WHERE LOWER(code) = LOWER(p_code)
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired coupon code'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if already redeemed
  IF EXISTS (SELECT 1 FROM zeroed_coupon_redemptions WHERE coupon_id = coupon.id AND user_id = p_user_id) THEN
    RETURN QUERY SELECT FALSE, 'Coupon already redeemed'::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Get or create subscription
  SELECT * INTO sub FROM zeroed_subscriptions WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO zeroed_subscriptions (user_id, status) VALUES (p_user_id, 'trialing')
    RETURNING * INTO sub;
  END IF;

  -- Apply coupon based on type
  CASE coupon.coupon_type
    WHEN 'free_forever' THEN
      UPDATE zeroed_subscriptions
      SET status = 'free_forever',
          coupon_code = p_code,
          coupon_applied_at = NOW(),
          updated_at = NOW()
      WHERE user_id = p_user_id;

      -- Record redemption
      INSERT INTO zeroed_coupon_redemptions (coupon_id, user_id) VALUES (coupon.id, p_user_id);
      UPDATE zeroed_coupons SET current_uses = current_uses + 1 WHERE id = coupon.id;

      RETURN QUERY SELECT TRUE, 'Lifetime free access activated!'::TEXT, 'free_forever'::TEXT;

    WHEN 'trial_extension' THEN
      UPDATE zeroed_subscriptions
      SET trial_ends_at = COALESCE(trial_ends_at, NOW()) + (coupon.trial_days_extension || ' days')::INTERVAL,
          coupon_code = p_code,
          coupon_applied_at = NOW(),
          updated_at = NOW()
      WHERE user_id = p_user_id;

      INSERT INTO zeroed_coupon_redemptions (coupon_id, user_id) VALUES (coupon.id, p_user_id);
      UPDATE zeroed_coupons SET current_uses = current_uses + 1 WHERE id = coupon.id;

      RETURN QUERY SELECT TRUE, ('Trial extended by ' || coupon.trial_days_extension || ' days!')::TEXT, 'trialing'::TEXT;

    ELSE
      RETURN QUERY SELECT FALSE, 'Coupon type not supported'::TEXT, NULL::TEXT;
  END CASE;
END;
$function$
;
