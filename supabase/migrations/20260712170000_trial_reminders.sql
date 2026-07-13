-- Trial-ending reminder emails.
-- To lift trial -> paid conversion we email trialing users as their 30-day Pro
-- trial winds down: once ~3 days out, then once ~1 day out. This column dedupes
-- those sends so the daily cron never emails the same user twice for the same
-- threshold.
--
--   0 = no reminder sent yet
--   1 = sent the ~3-day reminder
--   2 = sent the ~1-day reminder
--
-- The cron only advances the stage forward, so a user who is already at 2 is
-- skipped entirely. On resubscribe / a fresh trial (extend_trial, revoke of
-- free_forever, etc.) reset this back to 0 so a future trial can be reminded.

ALTER TABLE zeroed_subscriptions
  ADD COLUMN IF NOT EXISTS trial_reminder_stage integer NOT NULL DEFAULT 0;

-- The reminder cron scans trialing rows by trial_ends_at; index it so the scan
-- stays cheap as the table grows.
CREATE INDEX IF NOT EXISTS idx_zeroed_subscriptions_trial_ends_at
  ON zeroed_subscriptions (trial_ends_at)
  WHERE status = 'trialing';
