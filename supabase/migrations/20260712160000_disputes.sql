-- Dispute auto-handling + outbound email delivery log.
--
-- When a customer files a chargeback, Stripe fires charge.dispute.created. We
-- revoke access, compile evidence, and submit it to Stripe automatically. Two
-- supporting tables:
--   * zeroed_email_sends  — a record of every transactional email we send, so we
--     can prove delivery of receipts / account emails as dispute evidence.
--   * zeroed_disputes      — one row per dispute for idempotency + admin visibility.

-- Outbound transactional email log (written only by the service-role client).
CREATE TABLE IF NOT EXISTS zeroed_email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  email_type TEXT NOT NULL DEFAULT 'transactional',
  subject TEXT,
  resend_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_sends_user ON zeroed_email_sends (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_sends_to ON zeroed_email_sends (to_email, created_at DESC);

ALTER TABLE zeroed_email_sends ENABLE ROW LEVEL SECURITY;
-- No policies: anon/authenticated get no access; the service-role client (used by
-- the mailer and the dispute handler) bypasses RLS.

-- One row per Stripe dispute, for idempotency and an admin audit trail.
CREATE TABLE IF NOT EXISTS zeroed_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_dispute_id TEXT NOT NULL UNIQUE,
  stripe_charge_id TEXT,
  stripe_customer_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount INTEGER,
  currency TEXT,
  reason TEXT,
  status TEXT,
  evidence_submitted BOOLEAN NOT NULL DEFAULT false,
  access_revoked BOOLEAN NOT NULL DEFAULT false,
  due_by TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_customer ON zeroed_disputes (stripe_customer_id);

ALTER TABLE zeroed_disputes ENABLE ROW LEVEL SECURITY;
-- Service-role only (webhook handler + admin reads via service role).
