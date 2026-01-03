import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/header";
import { SettingsForm } from "@/components/settings/settings-form";

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
        <div className="max-w-2xl">
          <SettingsForm preferences={prefs} userEmail={user.email || ""} />
        </div>
      </div>
    </div>
  );
}
