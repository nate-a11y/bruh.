import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncAllTasksToCalendar } from "@/lib/integrations/calendar-sync";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get Google Calendar integration
    const { data: integration } = await supabase
      .from("zeroed_integrations")
      .select("sync_enabled")
      .eq("user_id", user.id)
      .eq("provider", "google_calendar")
      .single();

    if (!integration?.sync_enabled) {
      return NextResponse.json({ error: "Calendar sync not enabled" }, { status: 400 });
    }

    // Sync all tasks
    const result = await syncAllTasksToCalendar(user.id);

    // Update last sync time
    await supabase
      .from("zeroed_integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("provider", "google_calendar");

    return NextResponse.json({
      synced: result.synced,
      errors: result.errors,
      message: `Synced ${result.synced} tasks${result.errors > 0 ? `, ${result.errors} failed` : ""}`
    });
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
