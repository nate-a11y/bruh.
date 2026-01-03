import { createClient } from "@/lib/supabase/server";
import {
  getValidAccessToken,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  taskToCalendarEvent,
} from "./google-calendar";

interface TaskForSync {
  id: string;
  title: string;
  notes?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  estimated_minutes?: number;
  status: string;
}

/**
 * Sync a task to Google Calendar
 * Creates or updates the calendar event based on task changes
 */
export async function syncTaskToCalendar(
  userId: string,
  task: TaskForSync
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const supabase = await createClient();

    // Get integration settings
    const { data: integration } = await supabase
      .from("zeroed_integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", "google_calendar")
      .single();

    if (!integration || !integration.sync_enabled) {
      return { success: false, error: "Calendar sync not enabled" };
    }

    // Skip if task has no due date
    if (!task.due_date) {
      return { success: false, error: "Task has no due date" };
    }

    // Skip completed tasks if setting is disabled
    if (task.status === "completed" && !integration.settings?.sync_completed_tasks) {
      // If task was synced before, delete the event
      const { data: existingEvent } = await supabase
        .from("zeroed_calendar_events")
        .select("external_event_id, calendar_id")
        .eq("task_id", task.id)
        .single();

      if (existingEvent) {
        const accessToken = await getValidAccessToken(userId);
        if (accessToken) {
          await deleteCalendarEvent(
            accessToken,
            existingEvent.calendar_id,
            existingEvent.external_event_id
          );
        }
        await supabase
          .from("zeroed_calendar_events")
          .delete()
          .eq("task_id", task.id);
      }

      return { success: true };
    }

    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return { success: false, error: "Could not get access token" };
    }

    const calendarId = integration.settings?.calendar_id || "primary";
    const calendarEvent = taskToCalendarEvent(task);

    // Check if event already exists
    const { data: existingEvent } = await supabase
      .from("zeroed_calendar_events")
      .select("external_event_id")
      .eq("task_id", task.id)
      .single();

    let eventId: string;

    if (existingEvent) {
      // Update existing event
      const updated = await updateCalendarEvent(
        accessToken,
        calendarId,
        existingEvent.external_event_id,
        calendarEvent
      );
      eventId = updated.id!;
    } else {
      // Create new event
      const created = await createCalendarEvent(accessToken, calendarId, calendarEvent);
      eventId = created.id!;

      // Store the mapping
      await supabase.from("zeroed_calendar_events").insert({
        user_id: userId,
        task_id: task.id,
        external_event_id: eventId,
        provider: "google_calendar",
        calendar_id: calendarId,
        sync_direction: "outbound",
      });
    }

    // Update last sync time
    await supabase
      .from("zeroed_integrations")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", integration.id);

    return { success: true, eventId };
  } catch (error) {
    console.error("Calendar sync error:", error);
    return { success: false, error: "Sync failed" };
  }
}

/**
 * Remove a task from Google Calendar
 */
export async function removeTaskFromCalendar(
  userId: string,
  taskId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get the synced event
    const { data: syncedEvent } = await supabase
      .from("zeroed_calendar_events")
      .select("external_event_id, calendar_id")
      .eq("task_id", taskId)
      .single();

    if (!syncedEvent) {
      return { success: true }; // Nothing to delete
    }

    const accessToken = await getValidAccessToken(userId);
    if (!accessToken) {
      return { success: false, error: "Could not get access token" };
    }

    // Delete from Google Calendar
    await deleteCalendarEvent(
      accessToken,
      syncedEvent.calendar_id,
      syncedEvent.external_event_id
    );

    // Delete the mapping
    await supabase
      .from("zeroed_calendar_events")
      .delete()
      .eq("task_id", taskId);

    return { success: true };
  } catch (error) {
    console.error("Calendar delete error:", error);
    return { success: false, error: "Delete failed" };
  }
}

/**
 * Batch sync all tasks with due dates to calendar
 */
export async function syncAllTasksToCalendar(userId: string): Promise<{
  synced: number;
  errors: number;
}> {
  const supabase = await createClient();

  // Get integration
  const { data: integration } = await supabase
    .from("zeroed_integrations")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "google_calendar")
    .single();

  if (!integration || !integration.sync_enabled) {
    return { synced: 0, errors: 0 };
  }

  // Get all tasks with due dates
  const { data: tasks } = await supabase
    .from("zeroed_tasks")
    .select("id, title, notes, due_date, due_time, estimated_minutes, status")
    .eq("user_id", userId)
    .not("due_date", "is", null)
    .neq("status", "cancelled");

  if (!tasks || tasks.length === 0) {
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;

  for (const task of tasks) {
    const result = await syncTaskToCalendar(userId, task);
    if (result.success) {
      synced++;
    } else {
      errors++;
    }
  }

  return { synced, errors };
}
