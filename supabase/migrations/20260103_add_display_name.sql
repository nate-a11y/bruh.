-- Add display_name to user preferences
alter table zeroed_user_preferences add column if not exists display_name text;
