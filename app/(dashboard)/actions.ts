"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import type { RecurrenceRule } from "@/lib/supabase/types";

type TaskPriority = "low" | "normal" | "high" | "urgent";

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

  const { error } = await supabase.from("zeroed_tasks").insert({
    user_id: user.id,
    list_id: listId,
    title,
    notes: notes || null,
    estimated_minutes: estimatedMinutes,
    priority,
    due_date: dueDate || null,
    due_time: dueTime || null,
    position: (maxPosition?.position || 0) + 1,
  });

  if (error) {
    return { error: error.message };
  }

  // Update daily stats
  await incrementDailyStat(supabase, user.id, "tasks_created");

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

  const { error } = await supabase.from("zeroed_tasks").insert({
    user_id: user.id,
    list_id: listId,
    title,
    estimated_minutes: 25,
    priority: "normal",
    due_date: today,
    position: (maxPosition?.position || 0) + 1,
  });

  if (error) {
    return { error: error.message };
  }

  // Update daily stats
  await incrementDailyStat(supabase, user.id, "tasks_created");

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

  const { error } = await supabase
    .from("zeroed_tasks")
    .update(updates)
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
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
    .select("status, estimated_minutes, actual_minutes")
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
