-- Dunning / failed-payment recovery.
-- When a renewal (or trial-end first charge) fails, Stripe fires
-- invoice.payment_failed and we mark the subscription past_due. These columns
-- track the grace clock and the daily reminder cadence so a cron can email the
-- customer a pay link each day and cancel after a 7-day grace window.

ALTER TABLE zeroed_subscriptions
  ADD COLUMN IF NOT EXISTS past_due_since timestamptz,
  ADD COLUMN IF NOT EXISTS dunning_last_emailed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dunning_email_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS latest_invoice_url text;

ALTER TABLE zeroed_teams
  ADD COLUMN IF NOT EXISTS past_due_since timestamptz,
  ADD COLUMN IF NOT EXISTS dunning_last_emailed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dunning_email_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS latest_invoice_url text;

-- The dunning cron scans for past_due rows; index the clock column so the scan
-- stays cheap as the table grows.
CREATE INDEX IF NOT EXISTS idx_zeroed_subscriptions_past_due_since
  ON zeroed_subscriptions (past_due_since)
  WHERE past_due_since IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_zeroed_teams_past_due_since
  ON zeroed_teams (past_due_since)
  WHERE past_due_since IS NOT NULL;
