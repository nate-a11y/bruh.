"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

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
