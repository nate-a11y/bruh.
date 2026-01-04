"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateTaskDate(taskId: string, newDate: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
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
    .from("zeroed_tasks")
    .update({ due_date: newDate, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/timeline");
  revalidatePath("/today");
  revalidatePath("/");

  return { success: true };
}
