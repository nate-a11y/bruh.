-- Add email notification preferences
ALTER TABLE zeroed_user_preferences
ADD COLUMN IF NOT EXISTS daily_digest_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_summary_enabled BOOLEAN DEFAULT false;

-- Comment for clarity
COMMENT ON COLUMN zeroed_user_preferences.daily_digest_enabled IS 'Send daily task digest email every morning';
COMMENT ON COLUMN zeroed_user_preferences.weekly_summary_enabled IS 'Send weekly summary email every Monday';
