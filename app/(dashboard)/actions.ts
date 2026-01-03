"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { format, addDays, startOfWeek, addMonths, startOfMonth } from "date-fns";
import type {
  RecurrenceRule,
  Insertable,
  SmartFilterConfig,
} from "@/lib/supabase/types";
import { executeFilter } from "@/lib/filters/engine";
import { syncTaskToCalendar, removeTaskFromCalendar } from "@/lib/integrations/calendar-sync";
import { syncTaskToNotion, completeTaskInNotion, uncompleteTaskInNotion, archiveTaskInNotion } from "@/lib/integrations/notion-sync";
import { notifyTaskCreated, notifyTaskCompleted } from "@/lib/integrations/slack-notifications";

type TaskPriority = "low" | "normal" | "high" | "urgent";
type GoalTargetType = "tasks_completed" | "focus_minutes" | "focus_sessions" | "streak_days" | "custom";
type GoalPeriod = "daily" | "weekly" | "monthly" | "yearly" | "total";
type HabitFrequency = "daily" | "weekdays" | "weekends" | "custom";

// Helper to increment daily stats via RPC
async function incrementDailyStat(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  field: string,
  value: number = 1
) {
  const today = format(new Date(), "yyyy-MM-dd");

  // Try RPC first (if the function exists in Supabase)
  const { error: rpcError } = await supabase.rpc("zeroed_increment_daily_stat", {
    p_user_id: userId,
    p_date: today,
    p_field: field,
    p_value: value,
  });

  // Fallback: manual upsert if RPC doesn't exist
  if (rpcError) {
    // First ensure the row exists
    await supabase.from("zeroed_daily_stats").upsert(
      { user_id: userId, date: today },
      { onConflict: "user_id,date", ignoreDuplicates: true }
    );

    // Then increment the field
    const { data: current } = await supabase
      .from("zeroed_daily_stats")
      .select(field)
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    const currentRecord = current as Record<string, number> | null;
    const currentValue = currentRecord?.[field] ?? 0;
    await supabase
      .from("zeroed_daily_stats")
      .update({ [field]: currentValue + value })
      .eq("user_id", userId)
      .eq("date", today);
  }
}

// Task Actions
export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const title = formData.get("title") as string;
  const listId = formData.get("listId") as string;
  const notes = formData.get("notes") as string | null;
  const estimatedMinutes = parseInt(
    (formData.get("estimatedMinutes") as string) || "25"
  );
  const priority = ((formData.get("priority") as string) || "normal") as TaskPriority;
  const dueDate = formData.get("dueDate") as string | null;
  const dueTime = formData.get("dueTime") as string | null;

  // Get max position for this list
  const { data: maxPosition } = await supabase
    .from("zeroed_tasks")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const { data: task, error } = await supabase.from("zeroed_tasks").insert({
    user_id: user.id,
    list_id: listId,
    title,
    notes: notes || null,
    estimated_minutes: estimatedMinutes,
    priority,
    due_date: dueDate || null,
    due_time: dueTime || null,
    position: (maxPosition?.position || 0) + 1,
  }).select().single();

  if (error) {
    return { error: error.message };
  }

  // Update daily stats
  await incrementDailyStat(supabase, user.id, "tasks_created");

  // Sync to Google Calendar (fire and forget)
  if (task && dueDate) {
    syncTaskToCalendar(user.id, {
      id: task.id,
      title: task.title,
      notes: task.notes,
      due_date: task.due_date,
      due_time: task.due_time,
      estimated_minutes: task.estimated_minutes,
      status: task.status,
    }).catch(console.error);
  }

  // Sync to Notion (fire and forget)
  if (task) {
    syncTaskToNotion(user.id, {
      id: task.id,
      title: task.title,
      notes: task.notes,
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
    }).catch(console.error);
  }

  // Slack notification (fire and forget)
  if (task) {
    notifyTaskCreated(user.id, {
      id: task.id,
      title: task.title,
      due_date: task.due_date,
    }).catch(console.error);
  }

  revalidatePath("/today");
  revalidatePath("/lists");
  return { success: true };
}

export async function createQuickTask(title: string, listId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const today = format(new Date(), "yyyy-MM-dd");

  // Get max position for this list
  const { data: maxPosition } = await supabase
    .from("zeroed_tasks")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const { data: task, error } = await supabase.from("zeroed_tasks").insert({
    user_id: user.id,
    list_id: listId,
    title,
    estimated_minutes: 25,
    priority: "normal",
    due_date: today,
    position: (maxPosition?.position || 0) + 1,
  }).select().single();

  if (error) {
    return { error: error.message };
  }

  // Update daily stats
  await incrementDailyStat(supabase, user.id, "tasks_created");

  // Sync to Google Calendar (fire and forget)
  if (task) {
    syncTaskToCalendar(user.id, {
      id: task.id,
      title: task.title,
      notes: task.notes,
      due_date: task.due_date,
      due_time: task.due_time,
      estimated_minutes: task.estimated_minutes,
      status: task.status,
    }).catch(console.error);
  }

  // Sync to Notion (fire and forget)
  if (task) {
    syncTaskToNotion(user.id, {
      id: task.id,
      title: task.title,
      notes: task.notes,
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
    }).catch(console.error);
  }

  // Slack notification (fire and forget)
  if (task) {
    notifyTaskCreated(user.id, {
      id: task.id,
      title: task.title,
      due_date: task.due_date,
    }).catch(console.error);
  }

  revalidatePath("/today");
  revalidatePath("/lists");
  return { success: true };
}

export async function updateTask(taskId: string, updates: Record<string, unknown>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: task, error } = await supabase
    .from("zeroed_tasks")
    .update(updates)
    .eq("id", taskId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Sync to Google Calendar (fire and forget)
  if (task && task.due_date) {
    syncTaskToCalendar(user.id, {
      id: task.id,
      title: task.title,
      notes: task.notes,
      due_date: task.due_date,
      due_time: task.due_time,
      estimated_minutes: task.estimated_minutes,
      status: task.status,
    }).catch(console.error);
  }

  // Sync to Notion (fire and forget)
  if (task) {
    syncTaskToNotion(user.id, {
      id: task.id,
      title: task.title,
      notes: task.notes,
      due_date: task.due_date,
      priority: task.priority,
      status: task.status,
    }).catch(console.error);
  }

  revalidatePath("/today");
  revalidatePath("/lists");
  return { success: true };
}

export async function completeTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data: task, error: fetchError } = await supabase
    .from("zeroed_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (fetchError) {
    return { error: fetchError.message };
  }

  const newStatus = task.status === "completed" ? "pending" : "completed";

  const { error } = await supabase
    .from("zeroed_tasks")
    .update({
      status: newStatus,
      completed_at: newStatus === "completed" ? new Date().toISOString() : null,
    })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  // Update daily stats if completing (not uncompleting)
  if (newStatus === "completed") {
    await incrementDailyStat(supabase, user.id, "tasks_completed");
    if (task.estimated_minutes) {
      await incrementDailyStat(supabase, user.id, "estimated_minutes", task.estimated_minutes);
    }
    if (task.actual_minutes) {
      await incrementDailyStat(supabase, user.id, "actual_minutes", task.actual_minutes);
    }
  }

  // Sync to Google Calendar (fire and forget)
  if (task.due_date) {
    syncTaskToCalendar(user.id, {
      id: task.id,
      title: task.title,
      notes: task.notes,
      due_date: task.due_date,
      due_time: task.due_time,
      estimated_minutes: task.estimated_minutes,
      status: newStatus,
    }).catch(console.error);
  }

  // Sync to Notion (fire and forget)
  if (newStatus === "completed") {
    completeTaskInNotion(user.id, task.id).catch(console.error);
  } else {
    uncompleteTaskInNotion(user.id, task.id).catch(console.error);
  }

  // Slack notification (fire and forget)
  if (newStatus === "completed") {
    notifyTaskCompleted(user.id, {
      id: task.id,
      title: task.title,
    }).catch(console.error);
  }

  revalidatePath("/today");
  revalidatePath("/lists");
  revalidatePath("/stats");
  return { success: true };
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Remove from Google Calendar before deleting (fire and forget)
  removeTaskFromCalendar(user.id, taskId).catch(console.error);

  // Archive in Notion before deleting (fire and forget)
  archiveTaskInNotion(user.id, taskId).catch(console.error);

  const { error } = await supabase
    .from("zeroed_tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/today");
  revalidatePath("/lists");
  return { success: true };
}

// List Actions
export async function createList(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const name = formData.get("name") as string;
  const color = (formData.get("color") as string) || "#6366f1";

  // Get max position
  const { data: maxPosition } = await supabase
    .from("zeroed_lists")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from("zeroed_lists")
    .insert({
      user_id: user.id,
      name,
      color,
      position: (maxPosition?.position || 0) + 1,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/today");
  revalidatePath("/lists");
  return { success: true, list: data };
}

export async function createListDirect(name: string, color: string = "#6366f1") {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get max position
  const { data: maxPosition } = await supabase
    .from("zeroed_lists")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from("zeroed_lists")
    .insert({
      user_id: user.id,
      name,
      color,
      position: (maxPosition?.position || 0) + 1,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/today");
  revalidatePath("/lists");
  return { success: true, list: data };
}

export async function updateList(
  listId: string,
  updates: Record<string, unknown>
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("zeroed_lists")
    .update(updates)
    .eq("id", listId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/today");
  revalidatePath("/lists");
  return { success: true };
}

export async function deleteList(listId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Check if it's the Inbox list (first list or name is Inbox)
  const { data: list } = await supabase
    .from("zeroed_lists")
    .select("name")
    .eq("id", listId)
    .single();

  if (list?.name === "Inbox") {
    return { error: "Cannot delete the Inbox list" };
  }

  const { error } = await supabase
    .from("zeroed_lists")
    .delete()
    .eq("id", listId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/today");
  revalidatePath("/lists");
  return { success: true };
}

// Focus Session Actions
export async function createFocusSession(
  taskId: string | null,
  durationMinutes: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("zeroed_focus_sessions")
    .insert({
      user_id: user.id,
      task_id: taskId,
      duration_minutes: durationMinutes,
      session_type: "focus",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { success: true, session: data };
}

export async function completeFocusSession(
  sessionId: string,
  actualMinutes: number,
  taskId?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Update the focus session
  const { error: sessionError } = await supabase
    .from("zeroed_focus_sessions")
    .update({
      ended_at: new Date().toISOString(),
      completed: true,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (sessionError) {
    return { error: sessionError.message };
  }

  // Update task's actual_minutes if there was a task
  if (taskId) {
    const { data: task } = await supabase
      .from("zeroed_tasks")
      .select("actual_minutes")
      .eq("id", taskId)
      .single();

    await supabase
      .from("zeroed_tasks")
      .update({
        actual_minutes: (task?.actual_minutes || 0) + actualMinutes,
      })
      .eq("id", taskId);
  }

  // Update daily stats using the increment helper
  await incrementDailyStat(supabase, user.id, "focus_minutes", actualMinutes);
  await incrementDailyStat(supabase, user.id, "sessions_completed");

  revalidatePath("/today");
  revalidatePath("/focus");
  revalidatePath("/stats");
  return { success: true };
}

// ============================================================================
// SUBTASK ACTIONS
// ============================================================================

export async function createSubtask(parentId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get parent task to inherit list_id
  const { data: parent } = await supabase
    .from("zeroed_tasks")
    .select("list_id, user_id")
    .eq("id", parentId)
    .single();

  if (!parent || parent.user_id !== user.id) {
    return { error: "Parent task not found" };
  }

  const title = formData.get("title") as string;
  const estimatedMinutes = parseInt(
    (formData.get("estimatedMinutes") as string) || "15"
  );

  // Get max position among siblings
  const { data: maxPos } = await supabase
    .from("zeroed_tasks")
    .select("position")
    .eq("parent_id", parentId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const { data, error } = await supabase
    .from("zeroed_tasks")
    .insert({
      user_id: user.id,
      list_id: parent.list_id,
      parent_id: parentId,
      is_subtask: true,
      title,
      estimated_minutes: estimatedMinutes,
      position: (maxPos?.position || 0) + 1,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true, subtask: data };
}

export async function promoteSubtaskToTask(subtaskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("zeroed_tasks")
    .update({
      parent_id: null,
      is_subtask: false,
    })
    .eq("id", subtaskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function convertToSubtask(taskId: string, newParentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Prevent circular reference
  if (taskId === newParentId) {
    return { error: "Cannot make a task a subtask of itself" };
  }

  // Get parent's list_id
  const { data: parent } = await supabase
    .from("zeroed_tasks")
    .select("list_id")
    .eq("id", newParentId)
    .eq("user_id", user.id)
    .single();

  if (!parent) {
    return { error: "Parent task not found" };
  }

  const { error } = await supabase
    .from("zeroed_tasks")
    .update({
      parent_id: newParentId,
      is_subtask: true,
      list_id: parent.list_id,
    })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function getSubtaskProgress(taskId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("zeroed_get_subtask_progress", {
    task_uuid: taskId,
  });

  if (error) {
    return { total: 0, completed: 0 };
  }

  return data[0] || { total: 0, completed: 0 };
}

// ============================================================================
// TAG ACTIONS
// ============================================================================

export async function createTag(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const name = (formData.get("name") as string).trim();
  const color = (formData.get("color") as string) || "#6366f1";

  if (!name) {
    return { error: "Tag name is required" };
  }

  const { data, error } = await supabase
    .from("zeroed_tags")
    .insert({
      user_id: user.id,
      name,
      color,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Tag already exists" };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true, tag: data };
}

export async function updateTag(
  tagId: string,
  updates: { name?: string; color?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("zeroed_tags")
    .update(updates)
    .eq("id", tagId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function deleteTag(tagId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("zeroed_tags")
    .delete()
    .eq("id", tagId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function addTagToTask(taskId: string, tagId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify task belongs to user
  const { data: task } = await supabase
    .from("zeroed_tasks")
    .select("id")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (!task) {
    return { error: "Task not found" };
  }

  const { error } = await supabase
    .from("zeroed_task_tags")
    .insert({ task_id: taskId, tag_id: tagId });

  if (error) {
    if (error.code === "23505") {
      return { error: "Tag already added" };
    }
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function removeTagFromTask(taskId: string, tagId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("zeroed_task_tags")
    .delete()
    .eq("task_id", taskId)
    .eq("tag_id", tagId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

export async function getUserTags() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data } = await supabase
    .from("zeroed_tags")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  return data || [];
}

// ============================================================================
// RECURRING TASK ACTIONS
// ============================================================================

function calculateNextOccurrence(
  rule: RecurrenceRule,
  fromDate: Date
): Date | null {
  const next = new Date(fromDate);

  switch (rule.frequency) {
    case "daily":
      next.setDate(next.getDate() + rule.interval);
      break;
    case "weekly":
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // Find next matching day
        let found = false;
        for (let i = 1; i <= 7 * rule.interval; i++) {
          const check = new Date(fromDate);
          check.setDate(check.getDate() + i);
          if (rule.daysOfWeek.includes(check.getDay())) {
            next.setTime(check.getTime());
            found = true;
            break;
          }
        }
        if (!found) {
          next.setDate(next.getDate() + 7 * rule.interval);
        }
      } else {
        next.setDate(next.getDate() + 7 * rule.interval);
      }
      break;
    case "monthly":
      next.setMonth(next.getMonth() + rule.interval);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + rule.interval);
      break;
  }

  // Check end date
  if (rule.endDate && next > new Date(rule.endDate)) {
    return null;
  }

  return next;
}

export async function createRecurringTask(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const title = formData.get("title") as string;
  const listId = formData.get("listId") as string;
  const estimatedMinutes = parseInt(
    (formData.get("estimatedMinutes") as string) || "25"
  );
  const priority = ((formData.get("priority") as string) ||
    "normal") as TaskPriority;
  const dueDate = formData.get("dueDate") as string;

  // Recurrence config
  const frequency = formData.get("frequency") as RecurrenceRule["frequency"];
  const interval = parseInt((formData.get("interval") as string) || "1");
  const daysOfWeek = formData
    .getAll("daysOfWeek")
    .map((d) => parseInt(d as string));
  const endDate = formData.get("endDate") as string | null;

  const recurrenceRule: RecurrenceRule = {
    frequency,
    interval,
    ...(daysOfWeek.length > 0 && { daysOfWeek }),
    ...(endDate && { endDate }),
  };

  const { data, error } = await supabase
    .from("zeroed_tasks")
    .insert({
      user_id: user.id,
      list_id: listId,
      title,
      estimated_minutes: estimatedMinutes,
      priority,
      due_date: dueDate,
      is_recurring: true,
      recurrence_rule: recurrenceRule,
      recurrence_index: 0,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true, task: data };
}

export async function completeRecurringTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get the task
  const { data: task, error: fetchError } = await supabase
    .from("zeroed_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !task) {
    return { error: "Task not found" };
  }

  if (!task.is_recurring || !task.recurrence_rule) {
    // Not recurring, just complete normally
    return completeTask(taskId);
  }

  const rule = task.recurrence_rule as RecurrenceRule;
  const currentDueDate = task.due_date ? new Date(task.due_date) : new Date();

  // Calculate next occurrence
  const nextDate = calculateNextOccurrence(rule, currentDueDate);

  // Mark current as completed
  const { error: updateError } = await supabase
    .from("zeroed_tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (updateError) {
    return { error: updateError.message };
  }

  // Create next occurrence if not past end date
  if (nextDate) {
    await supabase.from("zeroed_tasks").insert({
      user_id: user.id,
      list_id: task.list_id,
      title: task.title,
      notes: task.notes,
      estimated_minutes: task.estimated_minutes,
      priority: task.priority,
      due_date: nextDate.toISOString().split("T")[0],
      due_time: task.due_time,
      is_recurring: true,
      recurrence_rule: rule,
      recurrence_parent_id: task.recurrence_parent_id || task.id,
      recurrence_index: task.recurrence_index + 1,
    });
  }

  // Update daily stats
  await incrementDailyStat(supabase, user.id, "tasks_completed");

  revalidatePath("/");
  return { success: true };
}

export async function skipRecurringOccurrence(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get the task
  const { data: task } = await supabase
    .from("zeroed_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (!task) {
    return { error: "Task not found" };
  }

  const rule = task.recurrence_rule as RecurrenceRule;
  const currentDueDate = task.due_date ? new Date(task.due_date) : new Date();
  const nextDate = calculateNextOccurrence(rule, currentDueDate);

  if (nextDate) {
    // Update to next occurrence date instead of completing
    const { error } = await supabase
      .from("zeroed_tasks")
      .update({
        due_date: nextDate.toISOString().split("T")[0],
        recurrence_index: task.recurrence_index + 1,
      })
      .eq("id", taskId);

    if (error) {
      return { error: error.message };
    }
  } else {
    // No more occurrences, mark as cancelled
    const { error } = await supabase
      .from("zeroed_tasks")
      .update({ status: "cancelled" })
      .eq("id", taskId);

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/");
  return { success: true };
}

export async function stopRecurring(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const { error } = await supabase
    .from("zeroed_tasks")
    .update({
      is_recurring: false,
      recurrence_rule: null,
    })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/");
  return { success: true };
}

// ============================================================================
// SPRINT 2: VIEW PREFERENCE ACTIONS
// ============================================================================

export async function getViewPreferences(listId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("zeroed_view_preferences")
    .select("*")
    .eq("user_id", user.id)
    .eq("list_id", listId || "global")
    .single();

  return data;
}

export async function updateViewPreferences(
  listId: string | null,
  updates: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Use type assertion for tables not in our schema types
  const { error } = await (supabase as unknown as { from: (table: string) => { upsert: (data: Record<string, unknown>, options?: { onConflict?: string }) => Promise<{ error: { message: string } | null }> } })
    .from("zeroed_view_preferences")
    .upsert({
      user_id: user.id,
      list_id: listId || "global",
      ...updates,
    }, { onConflict: "user_id,list_id" });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function updateTaskPosition(
  taskId: string,
  newPosition: number,
  newStatus?: string,
  newListId?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const updates: Record<string, unknown> = { position: newPosition };
  if (newStatus) updates.status = newStatus;
  if (newListId) updates.list_id = newListId;

  const { error } = await supabase
    .from("zeroed_tasks")
    .update(updates)
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

// ============================================================================
// SPRINT 3: GOAL ACTIONS
// ============================================================================

export async function createGoal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const goalData: Insertable<"zeroed_goals"> = {
    user_id: user.id,
    title: formData.get("title") as string,
    description: formData.get("description") as string || null,
    target_type: formData.get("targetType") as GoalTargetType,
    target_value: parseInt(formData.get("targetValue") as string),
    period: formData.get("period") as GoalPeriod,
    start_date: formData.get("startDate") as string || format(new Date(), "yyyy-MM-dd"),
    end_date: formData.get("endDate") as string || null,
    color: formData.get("color") as string || "#6366f1",
    icon: formData.get("icon") as string || "target",
  };
  const { data, error } = await supabase.from("zeroed_goals").insert(goalData).select().single();

  if (error) return { error: error.message };

  revalidatePath("/goals");
  return { success: true, goal: data };
}

export async function updateGoal(goalId: string, updates: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("zeroed_goals")
    .update(updates)
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/goals");
  return { success: true };
}

export async function deleteGoal(goalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("zeroed_goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/goals");
  return { success: true };
}

export async function getGoals() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("zeroed_goals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return data || [];
}

// ============================================================================
// SPRINT 3: HABIT ACTIONS
// ============================================================================

export async function createHabit(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: maxPos } = await supabase
    .from("zeroed_habits")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const frequencyDays = formData.getAll("frequencyDays").map(d => parseInt(d as string));

  const habitData: Insertable<"zeroed_habits"> = {
    user_id: user.id,
    name: formData.get("name") as string,
    description: formData.get("description") as string || null,
    icon: formData.get("icon") as string || "💪",
    color: formData.get("color") as string || "#6366f1",
    frequency: (formData.get("frequency") as HabitFrequency) || "daily",
    frequency_days: frequencyDays.length > 0 ? frequencyDays : [0, 1, 2, 3, 4, 5, 6],
    target_per_day: parseInt(formData.get("targetPerDay") as string) || 1,
    reminder_time: formData.get("reminderTime") as string || null,
    position: (maxPos?.position || 0) + 1,
  };
  const { data, error } = await supabase.from("zeroed_habits").insert(habitData).select().single();

  if (error) return { error: error.message };

  revalidatePath("/habits");
  return { success: true, habit: data };
}

export async function updateHabit(habitId: string, updates: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("zeroed_habits")
    .update(updates)
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/habits");
  return { success: true };
}

export async function deleteHabit(habitId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("zeroed_habits")
    .delete()
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/habits");
  return { success: true };
}

export async function logHabitCompletion(habitId: string, count: number = 1, notes?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const today = format(new Date(), "yyyy-MM-dd");

  // Check if log exists for today
  const { data: existing } = await supabase
    .from("zeroed_habit_logs")
    .select("*")
    .eq("habit_id", habitId)
    .eq("date", today)
    .single();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from("zeroed_habit_logs")
      .update({ completed_count: existing.completed_count + count, notes })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    // Create new log
    const { error } = await supabase.from("zeroed_habit_logs").insert({
      habit_id: habitId,
      user_id: user.id,
      date: today,
      completed_count: count,
      notes,
    });
    if (error) return { error: error.message };
  }

  // Update habit streak
  const { data: habit } = await supabase
    .from("zeroed_habits")
    .select("streak_current, streak_best, total_completions")
    .eq("id", habitId)
    .single();

  if (habit) {
    const newTotal = habit.total_completions + count;
    const newStreak = habit.streak_current + 1;
    const newBest = Math.max(habit.streak_best, newStreak);

    await supabase
      .from("zeroed_habits")
      .update({
        total_completions: newTotal,
        streak_current: newStreak,
        streak_best: newBest,
      })
      .eq("id", habitId);
  }

  revalidatePath("/habits");
  return { success: true };
}

export async function getHabits() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("zeroed_habits")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("position");

  return data || [];
}

export async function getHabitLogs(habitId: string, startDate: string, endDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("zeroed_habit_logs")
    .select("*")
    .eq("habit_id", habitId)
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  return data || [];
}

// ============================================================================
// SPRINT 3: GAMIFICATION ACTIONS
// ============================================================================

export async function awardPoints(points: number, reason: string, referenceId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Log points
  await supabase.from("zeroed_points_history").insert({
    user_id: user.id,
    points,
    reason,
    reference_id: referenceId || null,
  });

  // Update total points in user preferences
  const { data: prefs } = await supabase
    .from("zeroed_user_preferences")
    .select("total_points, level")
    .eq("user_id", user.id)
    .single();

  const newTotal = (prefs?.total_points || 0) + points;

  await supabase
    .from("zeroed_user_preferences")
    .update({ total_points: newTotal })
    .eq("user_id", user.id);

  revalidatePath("/");
  return { success: true, newTotal };
}

export async function checkAndAwardAchievement(achievementType: string, value: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { earned: [] };

  // Get already earned achievements
  const { data: earned } = await supabase
    .from("zeroed_achievements")
    .select("achievement_tier")
    .eq("user_id", user.id)
    .eq("achievement_type", achievementType);

  const earnedTiers = new Set(earned?.map(e => e.achievement_tier) || []);
  const newAchievements: number[] = [];

  // Check which tiers are newly earned
  // This is a simplified version - in production you'd check against ACHIEVEMENTS constant
  const tiers = [1, 5, 10, 25, 50, 100]; // Example tiers
  for (const tier of tiers) {
    if (value >= tier && !earnedTiers.has(tier)) {
      await supabase.from("zeroed_achievements").insert({
        user_id: user.id,
        achievement_type: achievementType,
        achievement_tier: tier,
      });
      newAchievements.push(tier);
    }
  }

  return { earned: newAchievements };
}

export async function getAchievements() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("zeroed_achievements")
    .select("*")
    .eq("user_id", user.id)
    .order("earned_at", { ascending: false });

  return data || [];
}

export async function getPointsHistory(limit: number = 50) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("zeroed_points_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data || [];
}

// ============================================================================
// SPRINT 5: TEMPLATE ACTIONS
// ============================================================================

export async function createTaskFromTemplate(templateId: string, listId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: template } = await supabase
    .from("zeroed_task_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!template) return { error: "Template not found" };

  const taskData = template.task_data as { title: string; notes?: string; priority?: string; estimated_minutes?: number } | null;
  if (!taskData) return { error: "Invalid template data" };

  // Get max position
  const { data: maxPos } = await supabase
    .from("zeroed_tasks")
    .select("position")
    .eq("list_id", listId)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const { data: task, error } = await supabase
    .from("zeroed_tasks")
    .insert({
      user_id: user.id,
      list_id: listId,
      title: taskData.title,
      notes: taskData.notes || null,
      priority: (taskData.priority as TaskPriority) || "normal",
      estimated_minutes: taskData.estimated_minutes || 25,
      position: (maxPos?.position || 0) + 1,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Create subtasks if any
  const subtasksData = template.subtasks as Array<{ title: string; estimated_minutes: number }> | null;
  if (subtasksData && subtasksData.length > 0) {
    const subtasks = subtasksData.map((st, i) => ({
      user_id: user.id,
      list_id: listId,
      parent_id: task.id,
      is_subtask: true,
      title: st.title,
      estimated_minutes: st.estimated_minutes || 15,
      position: i,
    }));
    await supabase.from("zeroed_tasks").insert(subtasks);
  }

  // Update use count
  await supabase
    .from("zeroed_task_templates")
    .update({ use_count: template.use_count + 1 })
    .eq("id", templateId);

  revalidatePath("/");
  return { success: true, task };
}

export async function saveTaskAsTemplate(taskId: string, name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: task } = await supabase
    .from("zeroed_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (!task) return { error: "Task not found" };

  // Get subtasks
  const { data: subtasks } = await supabase
    .from("zeroed_tasks")
    .select("title, estimated_minutes")
    .eq("parent_id", taskId)
    .eq("is_subtask", true);

  const { data: template, error } = await supabase
    .from("zeroed_task_templates")
    .insert({
      user_id: user.id,
      name,
      task_data: {
        title: task.title,
        notes: task.notes,
        priority: task.priority,
        estimated_minutes: task.estimated_minutes,
      },
      subtasks: subtasks || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  return { success: true, template };
}

export async function createProjectFromTemplate(templateId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: template } = await supabase
    .from("zeroed_project_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (!template) return { error: "Template not found" };

  const listData = template.list_data as { name: string; color?: string } | null;
  const tasksData = template.tasks as Array<{ title: string; estimated_minutes?: number; priority?: string }> | null;

  if (!listData) return { error: "Invalid template list data" };

  // Get max position for lists
  const { data: maxListPos } = await supabase
    .from("zeroed_lists")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  // Create list
  const { data: list, error: listError } = await supabase
    .from("zeroed_lists")
    .insert({
      user_id: user.id,
      name: listData.name,
      color: listData.color || "#6366f1",
      position: (maxListPos?.position || 0) + 1,
    })
    .select()
    .single();

  if (listError) return { error: listError.message };

  // Create tasks
  if (tasksData && tasksData.length > 0) {
    for (let i = 0; i < tasksData.length; i++) {
      const t = tasksData[i];
      await supabase.from("zeroed_tasks").insert({
        user_id: user.id,
        list_id: list.id,
        title: t.title,
        estimated_minutes: t.estimated_minutes || 25,
        priority: (t.priority as TaskPriority) || "normal",
        position: i,
      });
    }
  }

  // Update use count
  await supabase
    .from("zeroed_project_templates")
    .update({ use_count: template.use_count + 1 })
    .eq("id", templateId);

  revalidatePath("/lists");
  return { success: true, list };
}

export async function getTaskTemplates() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("zeroed_task_templates")
    .select("*")
    .or(`user_id.eq.${user.id},is_public.eq.true`)
    .order("use_count", { ascending: false });

  return data || [];
}

export async function getProjectTemplates(category?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from("zeroed_project_templates")
    .select("*")
    .or(`user_id.eq.${user?.id || "00000000-0000-0000-0000-000000000000"},is_public.eq.true`);

  if (category) {
    query = query.eq("category", category);
  }

  const { data } = await query.order("use_count", { ascending: false });

  return data || [];
}

// ============================================================================
// SPRINT 6: ANALYTICS ACTIONS
// ============================================================================

export async function getProductivityMetrics(startDate: string, endDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get current period stats
  const { data: currentStats } = await supabase
    .from("zeroed_daily_stats")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate);

  // Calculate metrics
  const tasksCompleted = currentStats?.reduce((s, d) => s + (d.tasks_completed || 0), 0) || 0;
  const tasksCreated = currentStats?.reduce((s, d) => s + (d.tasks_created || 0), 0) || 0;
  const focusMinutes = currentStats?.reduce((s, d) => s + (d.focus_minutes || 0), 0) || 0;
  const sessionsCompleted = currentStats?.reduce((s, d) => s + (d.sessions_completed || 0), 0) || 0;

  // Get user preferences for streak
  const { data: prefs } = await supabase
    .from("zeroed_user_preferences")
    .select("streak_current, streak_best")
    .eq("user_id", user.id)
    .single();

  return {
    tasksCompleted,
    tasksCreated,
    completionRate: tasksCreated > 0 ? tasksCompleted / tasksCreated : 0,
    focusMinutes,
    sessionsCompleted,
    avgTaskDuration: tasksCompleted > 0 ? focusMinutes / tasksCompleted : 0,
    estimationAccuracy: 0, // Would need actual vs estimated comparison
    currentStreak: prefs?.streak_current || 0,
    longestStreak: prefs?.streak_best || 0,
    tasksCompletedTrend: 0,
    focusMinutesTrend: 0,
  };
}

export async function getDailyBreakdown(startDate: string, endDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("zeroed_daily_stats")
    .select("date, tasks_completed, focus_minutes, sessions_completed")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");

  return data?.map(d => ({
    date: d.date,
    tasksCompleted: d.tasks_completed || 0,
    focusMinutes: d.focus_minutes || 0,
    sessionsCompleted: d.sessions_completed || 0,
  })) || [];
}

// ============================================================================
// SPRINT 6: TIME TRACKING ACTIONS
// ============================================================================

export async function createTimeEntry(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const startTime = formData.get("startTime") as string;
  const endTime = formData.get("endTime") as string | null;
  const durationMinutes = formData.get("durationMinutes") as string;

  const { data, error } = await supabase.from("zeroed_time_entries").insert({
    user_id: user.id,
    task_id: formData.get("taskId") as string || null,
    description: formData.get("description") as string || null,
    start_time: startTime,
    end_time: endTime || null,
    duration_minutes: parseInt(durationMinutes) || 0,
    is_manual: true,
  }).select().single();

  if (error) return { error: error.message };

  revalidatePath("/time");
  return { success: true, entry: data };
}

export async function getTimeEntries(startDate: string, endDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("zeroed_time_entries")
    .select("*, zeroed_tasks(title)")
    .eq("user_id", user.id)
    .gte("start_time", startDate)
    .lte("start_time", endDate)
    .order("start_time", { ascending: false });

  return data || [];
}

export async function deleteTimeEntry(entryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("zeroed_time_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/time");
  return { success: true };
}

// ============================================================================
// SPRINT 6: DATA EXPORT/DELETE ACTIONS
// ============================================================================

export async function exportAllData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const [tasks, lists, tags, goals, habits, focusSessions, dailyStats] = await Promise.all([
    supabase.from("zeroed_tasks").select("*").eq("user_id", user.id),
    supabase.from("zeroed_lists").select("*").eq("user_id", user.id),
    supabase.from("zeroed_tags").select("*").eq("user_id", user.id),
    supabase.from("zeroed_goals").select("*").eq("user_id", user.id),
    supabase.from("zeroed_habits").select("*").eq("user_id", user.id),
    supabase.from("zeroed_focus_sessions").select("*").eq("user_id", user.id),
    supabase.from("zeroed_daily_stats").select("*").eq("user_id", user.id),
  ]);

  return {
    data: {
      exportedAt: new Date().toISOString(),
      tasks: tasks.data || [],
      lists: lists.data || [],
      tags: tags.data || [],
      goals: goals.data || [],
      habits: habits.data || [],
      focusSessions: focusSessions.data || [],
      dailyStats: dailyStats.data || [],
    },
  };
}

export async function deleteAllData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Delete in order to respect foreign keys
  await supabase.from("zeroed_task_tags").delete().eq("user_id", user.id);
  await supabase.from("zeroed_tasks").delete().eq("user_id", user.id);
  await supabase.from("zeroed_lists").delete().eq("user_id", user.id);
  await supabase.from("zeroed_tags").delete().eq("user_id", user.id);
  await supabase.from("zeroed_goals").delete().eq("user_id", user.id);
  await supabase.from("zeroed_habit_logs").delete().eq("user_id", user.id);
  await supabase.from("zeroed_habits").delete().eq("user_id", user.id);
  await supabase.from("zeroed_focus_sessions").delete().eq("user_id", user.id);
  await supabase.from("zeroed_daily_stats").delete().eq("user_id", user.id);

  revalidatePath("/");
  return { success: true };
}

// ============================================================================
// SPRINT 6: ONBOARDING ACTIONS
// ============================================================================

export async function completeOnboarding(preferences: Record<string, unknown>, firstTask?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Update preferences
  await supabase
    .from("zeroed_user_preferences")
    .update({
      ...preferences,
      onboarding_completed: true,
    })
    .eq("user_id", user.id);

  // Create first task if provided
  if (firstTask) {
    const { data: inbox } = await supabase
      .from("zeroed_lists")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", "Inbox")
      .single();

    if (inbox) {
      await supabase.from("zeroed_tasks").insert({
        user_id: user.id,
        list_id: inbox.id,
        title: firstTask,
        due_date: format(new Date(), "yyyy-MM-dd"),
      });
    }
  }

  revalidatePath("/");
  return { success: true };
}

// ============================================================================
// SPRINT 8: SMART FILTER ACTIONS
// ============================================================================

export async function createSmartFilter(data: {
  name: string;
  icon: string;
  color: string;
  filter_config: SmartFilterConfig;
  is_pinned: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Get next position
  const { data: existing } = await supabase
    .from("zeroed_smart_filters")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1);

  const position = (existing?.[0]?.position ?? -1) + 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: filter, error } = await (supabase as any)
    .from("zeroed_smart_filters")
    .insert({
      user_id: user.id,
      name: data.name,
      icon: data.icon,
      color: data.color,
      filter_config: data.filter_config,
      is_pinned: data.is_pinned,
      position,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true, filter };
}

export async function getSmartFilters() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("zeroed_smart_filters")
    .select("*")
    .eq("user_id", user.id)
    .order("position");

  return data || [];
}

export async function deleteSmartFilter(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("zeroed_smart_filters")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function executeSmartFilter(filterId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Get filter config
  const { data: filter } = await supabase
    .from("zeroed_smart_filters")
    .select("filter_config")
    .eq("id", filterId)
    .single();

  if (!filter) return { error: "Filter not found" };

  // Increment use count - we'd need an RPC for atomic increment, but for now just note it
  // Could be done via: await supabase.rpc("increment_filter_use_count", { filter_id: filterId });

  // Execute filter
  const tasks = await executeFilter(user.id, filter.filter_config as unknown as SmartFilterConfig);
  return { success: true, tasks };
}

// ============================================================================
// SPRINT 8: SNOOZE ACTIONS
// ============================================================================

export async function snoozeTask(
  taskId: string,
  until: Date | 'tomorrow' | 'next_week' | 'next_month'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Get current task state for undo
  const { data: task } = await supabase
    .from("zeroed_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (!task) return { error: "Task not found" };

  // Calculate snooze date
  let snoozeDate: Date;
  if (until === 'tomorrow') {
    snoozeDate = addDays(new Date(), 1);
  } else if (until === 'next_week') {
    snoozeDate = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7);
  } else if (until === 'next_month') {
    snoozeDate = startOfMonth(addMonths(new Date(), 1));
  } else {
    snoozeDate = until;
  }

  // Save undo state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("zeroed_undo_history").insert({
    user_id: user.id,
    action_type: "snooze",
    entity_type: "task",
    entity_id: taskId,
    previous_state: task,
  });

  // Update task
  const { error } = await supabase
    .from("zeroed_tasks")
    .update({
      snoozed_until: format(snoozeDate, "yyyy-MM-dd"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true, snoozedUntil: snoozeDate };
}

export async function unsnoozeTask(taskId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("zeroed_tasks")
    .update({
      snoozed_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function getSnoozedTasks() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("zeroed_tasks")
    .select("*, zeroed_lists(name, color)")
    .eq("user_id", user.id)
    .not("snoozed_until", "is", null)
    .neq("status", "completed")
    .order("snoozed_until");

  return data || [];
}

// ============================================================================
// SPRINT 8: UNDO ACTIONS
// ============================================================================

export async function getUndoAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get most recent non-expired undo action
  const { data } = await supabase
    .from("zeroed_undo_history")
    .select("*")
    .eq("user_id", user.id)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}

export async function executeUndo(undoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Get undo action
  const { data: undo } = await supabase
    .from("zeroed_undo_history")
    .select("*")
    .eq("id", undoId)
    .eq("user_id", user.id)
    .single();

  if (!undo) return { error: "Undo action not found or expired" };

  const previousState = undo.previous_state as Record<string, unknown>;

  // Restore previous state based on entity type
  if (undo.entity_type === "task") {
    const { error } = await supabase
      .from("zeroed_tasks")
      .update({
        status: previousState.status as "pending" | "in_progress" | "completed" | "cancelled",
        snoozed_until: previousState.snoozed_until as string | null,
        list_id: previousState.list_id as string,
        priority: previousState.priority as "low" | "normal" | "high" | "urgent",
        updated_at: new Date().toISOString(),
      })
      .eq("id", undo.entity_id);

    if (error) return { error: error.message };
  }

  // Delete the undo action
  await supabase
    .from("zeroed_undo_history")
    .delete()
    .eq("id", undoId);

  revalidatePath("/");
  return { success: true };
}

// ============================================================================
// SPRINT 8: ARCHIVE/LOGBOOK ACTIONS
// ============================================================================

export async function getArchivedTasks(startDate?: string, endDate?: string, search?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("zeroed_archive")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false });

  if (startDate) {
    query = query.gte("completed_at", startDate);
  }
  if (endDate) {
    query = query.lte("completed_at", endDate);
  }
  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  const { data } = await query.limit(100);

  return data || [];
}

// ============================================================================
// SPRINT 8: DAILY PLANNING & SHUTDOWN ACTIONS
// ============================================================================

export async function saveDailyIntention(intention: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const today = format(new Date(), "yyyy-MM-dd");

  const { error } = await supabase
    .from("zeroed_user_preferences")
    .update({
      daily_intention: intention,
      last_daily_planning_at: today,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}

export async function completeShutdownRoutine() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const today = format(new Date(), "yyyy-MM-dd");

  const { error } = await supabase
    .from("zeroed_user_preferences")
    .update({
      last_shutdown_at: today,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  return { success: true };
}

export async function updateFocusSoundPreference(sound: string, volume: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("zeroed_user_preferences")
    .update({
      focus_sound: sound,
      focus_sound_volume: volume,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  return { success: true };
}

// ============================================================================
// BRAIN DUMP - AI-powered task parsing
// ============================================================================

import { parseBrainDump, type ParsedTask } from "@/lib/ai/parse-brain-dump";

export async function processBrainDump(text: string, listId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  try {
    // Parse the brain dump with AI
    const parsed = await parseBrainDump(text);

    if (parsed.tasks.length === 0) {
      return { error: "No tasks found. Try being more specific." };
    }

    // Get current max position for the list
    const { data: maxPos } = await supabase
      .from("zeroed_tasks")
      .select("position")
      .eq("list_id", listId)
      .order("position", { ascending: false })
      .limit(1)
      .single();

    let position = (maxPos?.position || 0) + 1;
    const createdTasks: { id: string; title: string }[] = [];

    // Create tasks
    for (const task of parsed.tasks) {
      const { data: newTask, error } = await supabase
        .from("zeroed_tasks")
        .insert({
          user_id: user.id,
          list_id: listId,
          title: task.title,
          notes: task.notes || null,
          priority: task.priority || "normal",
          due_date: task.due_date || null,
          estimated_minutes: task.estimated_minutes || 25,
          position: position++,
        })
        .select("id, title")
        .single();

      if (error) {
        console.error("Error creating task:", error);
        continue;
      }

      if (newTask) {
        createdTasks.push(newTask);

        // Create subtasks if any
        if (task.subtasks && task.subtasks.length > 0) {
          let subPosition = 0;
          for (const subtaskTitle of task.subtasks) {
            await supabase.from("zeroed_tasks").insert({
              user_id: user.id,
              list_id: listId,
              title: subtaskTitle,
              parent_id: newTask.id,
              priority: "normal",
              position: subPosition++,
            });
          }
        }
      }
    }

    revalidatePath("/");
    return {
      success: true,
      tasksCreated: createdTasks.length,
      tasks: createdTasks,
      notes: parsed.notes,
    };
  } catch (error) {
    console.error("Brain dump processing failed:", error);
    return { error: "Failed to process brain dump. Try again." };
  }
}

// ============================================================================
// ONBOARDING: UPDATE DISPLAY NAME
// ============================================================================

export async function updateDisplayName(name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("zeroed_user_preferences")
    .upsert({
      user_id: user.id,
      display_name: name.trim(),
    }, { onConflict: "user_id" });

  if (error) return { error: error.message };

  revalidatePath("/");
  return { success: true };
}
