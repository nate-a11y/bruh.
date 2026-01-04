"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Theme = "dark" | "light" | "system";

export async function updatePreferences(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const displayName = formData.get("displayName") as string;

  const updates = {
    theme: (formData.get("theme") as string) as Theme,
    display_name: displayName?.trim() || null,
    default_focus_minutes: parseInt(
      formData.get("defaultFocusMinutes") as string
    ),
    short_break_minutes: parseInt(formData.get("shortBreakMinutes") as string),
    long_break_minutes: parseInt(formData.get("longBreakMinutes") as string),
    sessions_before_long_break: parseInt(
      formData.get("sessionsBeforeLongBreak") as string
    ),
    sound_enabled: formData.get("soundEnabled") === "true",
    notifications_enabled: formData.get("notificationsEnabled") === "true",
    daily_digest_enabled: formData.get("dailyDigestEnabled") === "true",
    weekly_summary_enabled: formData.get("weeklySummaryEnabled") === "true",
  };

  const { error } = await supabase
    .from("zeroed_user_preferences")
    .upsert(
      {
        user_id: user.id,
        ...updates,
      },
      { onConflict: "user_id" }
    );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath("/focus");
  revalidatePath("/today");
  return { success: true };
}
