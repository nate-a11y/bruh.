import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncTaskToNotion } from "@/lib/integrations/notion-sync";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get Notion integration
    const { data: integration } = await supabase
      .from("zeroed_integrations")
      .select("settings, sync_enabled")
      .eq("user_id", user.id)
      .eq("provider", "notion")
      .single();

    if (!integration?.sync_enabled) {
      return NextResponse.json({ error: "Notion sync not enabled" }, { status: 400 });
    }

    const settings = integration.settings as { database_id?: string } | null;
    if (!settings?.database_id) {
      return NextResponse.json({ error: "No database selected" }, { status: 400 });
    }

    // Get all pending/in_progress tasks
    const { data: tasks } = await supabase
      .from("zeroed_tasks")
      .select("id, title, notes, due_date, priority, status")
      .eq("user_id", user.id)
      .in("status", ["pending", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ synced: 0, message: "No tasks to sync" });
    }

    let synced = 0;
    let errors = 0;

    for (const task of tasks) {
      try {
        await syncTaskToNotion(user.id, {
          id: task.id,
          title: task.title,
          notes: task.notes,
          due_date: task.due_date,
          priority: task.priority,
          status: task.status,
        });
        synced++;
      } catch {
        errors++;
      }
    }

    // Update last sync time
    await supabase
      .from("zeroed_integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("provider", "notion");

    return NextResponse.json({
      synced,
      errors,
      message: `Synced ${synced} tasks${errors > 0 ? `, ${errors} failed` : ""}`
    });
  } catch (error) {
    console.error("Notion sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
