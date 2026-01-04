-- Platform settings table for admin configuration
CREATE TABLE IF NOT EXISTS zeroed_platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO zeroed_platform_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('signups_enabled', 'true'),
  ('email_notifications', 'true')
ON CONFLICT (key) DO NOTHING;

-- Allow service role full access (no RLS needed for admin-only table)
ALTER TABLE zeroed_platform_settings ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only" ON zeroed_platform_settings
  FOR ALL
  USING (false)
  WITH CHECK (false);
