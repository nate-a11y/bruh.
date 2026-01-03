import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { SettingsForm } from "@/components/settings/settings-form";
import { GoogleCalendarSettings } from "@/components/settings/google-calendar-settings";
import { SlackSettings } from "@/components/settings/slack-settings";
import { NotionSettings } from "@/components/settings/notion-settings";
import { IntegrationsSettings } from "@/components/settings/integrations-settings";

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch user preferences
  const { data: preferences } = await supabase
    .from("zeroed_user_preferences")
    .select("*")
    .eq("user_id", user.id)
    .single();

  // Fetch integrations
  const { data: googleIntegration } = await supabase
    .from("zeroed_integrations")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "google_calendar")
    .single();

  const { data: slackIntegration } = await supabase
    .from("zeroed_integrations")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "slack")
    .single();

  const { data: notionIntegration } = await supabase
    .from("zeroed_integrations")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "notion")
    .single();

  // Default preferences if none exist
  const prefs = preferences || {
    theme: "dark",
    default_focus_minutes: 25,
    short_break_minutes: 5,
    long_break_minutes: 15,
    sessions_before_long_break: 4,
    sound_enabled: true,
    notifications_enabled: false,
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-8">
          <SettingsForm preferences={prefs} userEmail={user.email || ""} />

          {/* Integrations Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Integrations</h2>
              <p className="text-sm text-muted-foreground">
                Connect your favorite tools
              </p>
            </div>
            <div className="space-y-4">
              <GoogleCalendarSettings integration={googleIntegration} />
              <SlackSettings integration={slackIntegration} />
              <NotionSettings integration={notionIntegration} />
              <IntegrationsSettings />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
