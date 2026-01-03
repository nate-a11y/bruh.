-- User integrations table for OAuth connections
CREATE TABLE IF NOT EXISTS zeroed_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google_calendar', 'notion', etc.
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  provider_user_id TEXT, -- External user ID from the provider
  provider_email TEXT, -- Email associated with the connected account
  settings JSONB DEFAULT '{}', -- Provider-specific settings (e.g., which calendar to sync)
  last_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only have one connection per provider
  UNIQUE(user_id, provider)
);

-- Index for quick lookups
CREATE INDEX idx_zeroed_integrations_user_provider ON zeroed_integrations(user_id, provider);

-- Table to track synced calendar events
CREATE TABLE IF NOT EXISTS zeroed_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID REFERENCES zeroed_tasks(id) ON DELETE CASCADE,
  external_event_id TEXT NOT NULL, -- Google Calendar event ID
  provider TEXT NOT NULL DEFAULT 'google_calendar',
  calendar_id TEXT NOT NULL, -- Which calendar the event is in
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_direction TEXT DEFAULT 'outbound', -- 'outbound' (task→calendar) or 'inbound' (calendar→task)
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each external event maps to one task
  UNIQUE(external_event_id, provider)
);

CREATE INDEX idx_zeroed_calendar_events_task ON zeroed_calendar_events(task_id);
CREATE INDEX idx_zeroed_calendar_events_user ON zeroed_calendar_events(user_id);

-- RLS Policies
ALTER TABLE zeroed_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE zeroed_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations"
  ON zeroed_integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON zeroed_integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON zeroed_integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON zeroed_integrations FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own calendar events"
  ON zeroed_calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own calendar events"
  ON zeroed_calendar_events FOR ALL
  USING (auth.uid() = user_id);
