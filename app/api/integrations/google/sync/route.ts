import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncAllTasksToCalendar } from "@/lib/integrations/calendar-sync";
import { pullChangesFromCalendar } from "@/lib/integrations/google-calendar";

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

    // Step 1: Pull changes from Calendar first
    const pullResult = await pullChangesFromCalendar(user.id);

    // Step 2: Push our tasks to Calendar
    const pushResult = await syncAllTasksToCalendar(user.id);

    // Update last sync time
    await supabase
      .from("zeroed_integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("provider", "google_calendar");

    const totalSynced = pushResult.synced + pullResult.updated + pullResult.created;
    return NextResponse.json({
      synced: totalSynced,
      pushed: pushResult.synced,
      pulled: pullResult.updated + pullResult.created,
      errors: pushResult.errors,
      message: `Synced ${totalSynced} tasks (${pushResult.synced} pushed, ${pullResult.updated + pullResult.created} pulled)${pushResult.errors > 0 ? `, ${pushResult.errors} failed` : ""}`
    });
  } catch (error) {
    console.error("Calendar sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
